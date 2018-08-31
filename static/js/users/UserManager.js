import $ from 'jquery';
import {LoggingClass, Settings} from "../util";
import {User} from "./User";
import {_parseEmojis, setTitle} from "../lib";

export class UserManager extends LoggingClass {
    constructor(messageLog) {
        super();
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
    }

    addMessage({'sender id': senderId, ...messageData}) {
        console.log(Settings.activeLogId, Settings.activeLogType);
        const isCurrentLog = (Settings.activeLogType === 'thread' && Settings.activeLogId === senderId);
        this._userDataMap.get(senderId).addMessage(messageData, !isCurrentLog);
        if (isCurrentLog) {
            this._messageLog.printMessage(messageData);
        }
    }

    setActiveThread(userId) {
        Settings.activeLogType = 'thread';
        Settings.activeLogId = userId;
        let user = this._userDataMap.get(userId);
        this._messageLog.printMessages(user._threadMessages);
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
