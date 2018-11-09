import $ from 'jquery';
import {LoggingClass, Settings} from "../util";
import {User} from "./User";
import {_parseEmojis, setTitle} from "../lib";

export class UserManager extends LoggingClass {
    constructor(chatClient, messageLog) {
        super();
        this._chatClient = chatClient;
        this._messageLog = messageLog;
        this._userListElement = $('#user-list');
        this._userDataMap = new Map();
    }

    updateUserList(newUsers) {
        this._userListElement.empty();
        newUsers.forEach((userData) => {
            this._addUser(userData)
        });
        _parseEmojis(this._userListElement[0]);
    }

    addPrivateMessageThreads(threads) {
        threads.forEach((thread) => {
            this._userDataMap.get(thread['recipient id']).addPrivateMessageThread(thread);
        });
        // select the active thread. if the active thread is not present, reset to general room
        if (Settings.activeLogType === 'thread') {
            if (this._userDataMap.has(Settings.activeLogId)) {
                this.setActiveThread(Settings.activeLogId);
            }
            else {
                this._chatClient.selectGeneralRoom();
            }
        }
    }

    addMessage({'sender id': senderId, 'recipient id': recipientId, ...messageData}) {
        const otherUserId = recipientId === Settings.userId ? senderId : recipientId;
        const isCurrentLog = (Settings.activeLogType === 'thread' && Settings.activeLogId === otherUserId);
        const totalMessages = this._userDataMap.get(otherUserId).addMessage(messageData, !isCurrentLog);
        if (isCurrentLog) {
            if (totalMessages <= 1) {
                this._messageLog.clear();
            }
            this._messageLog.printMessage(messageData);
        }
    }

    setActiveThread(userId) {
        Settings.activeLogType = 'thread';
        Settings.activeLogId = userId;
        let user = this._userDataMap.get(userId);
        this._messageLog.printMessages(user._threadMessages, 'This private message thread is empty!');
        setTitle('Private Message');
        super.debug(`Active thread set to ${user.id}.`);
    }

    _addUser(userData) {
        let user;
        if (this._userDataMap.has(userData['id'])) {
            // if it's already in the map, update it
            user = this._userDataMap.get(userData['id']);
            user.updateUser(userData);
        }
        else {
            // otherwise, add a new user
            user = new User(userData, this);
            this._userDataMap.set(userData['id'], user);
        }
        this._userListElement.append(user.template);
    }

    tmp_getUserIdList() {
        return this._userDataMap.keys();
    }
}
