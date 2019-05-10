import $ from 'jquery';
import {LoggingClass, Settings} from "../util";
import {User} from "./User";
import {_focusChatBar, _parseEmojis, setTitle} from "../lib";

export class UserManager extends LoggingClass {
    constructor(chatClient, messageLog, soundManager) {
        super('UserManager');
        this._chatClient = chatClient;
        this._messageLog = messageLog;
        this._soundManager = soundManager;
        this._userListElement = $('#user-list');
        this._userDataMap = new Map();
    }

    getUserStatus(userId) {
        if (this._userDataMap.has(userId)) {
            return this._userDataMap.get(userId).status;
        }
    }

    getUserTypingStatus(userId) {
        if (this._userDataMap.has(userId)) {
            return this._userDataMap.get(userId).typing;
        }
    }

    updateUserList(newUsers) {
        if (newUsers === undefined) {
            this._userDataMap.forEach(user => {
                user.updateTypingStatus();
            })
        }
        else {
            this._userListElement.empty();
            newUsers.forEach((userData) => {
                this._addUser(userData);
            });
            _parseEmojis(this._userListElement[0]);
        }
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
        if (senderId === Settings.username) {
            this._soundManager.playSent();
        }
        else {
            this._soundManager.playReceived();
        }
    }

    setActiveThread(userId) {
        Settings.activeLogType = 'thread';
        Settings.activeLogId = userId;
        let user = this._userDataMap.get(userId);
        this._messageLog.printMessages(user._threadMessages, user.id === Settings.userId ?
            'You can talk to yourself here!' : `There are no messages here. Anything you say here is just between you and ${user.username}!`);
        this._chatClient.sendTyping();
        this._chatClient.setWindowTitle();
        _focusChatBar();
        this.updateUserList();
        super.debug(`Active thread set to ${user.id}.`);
    }

    getActiveThreadName() {
        return this._userDataMap.get(Settings.activeLogId).username;
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
}
