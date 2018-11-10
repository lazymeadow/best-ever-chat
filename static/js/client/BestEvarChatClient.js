import $ from 'jquery';
import SockJS from 'sockjs-client';
import {RoomManager} from "../rooms";
import {UserManager} from "../users";
import {Logger, Settings, SoundManager} from "../util";
import {Alert, MainMenu, MessageLog} from "../components";
import {CLIENT_VERSION} from "../lib";

export class BestEvarChatClient {
    constructor(hostname = 'localhost:6969', routingPath = 'newchat') {
        this._hostname = hostname;
        this._routingPath = routingPath;

        Settings.init();
        new MainMenu(this);

        this._messageLog = new MessageLog();
        this._soundManager = new SoundManager();
        this._roomManager = new RoomManager(this, this._messageLog, this._soundManager);
        this._userManager = new UserManager(this, this._messageLog, this._soundManager);

        this.connect();
    }

    // Public functions

    connect() {
        this._sock = new SockJS(`http://${this._hostname}/${this._routingPath}/`);

        this._sock.onopen = () => {
            this._send({
                'type': 'version',
                'client version': CLIENT_VERSION
            });
        };
        this._sock.onmessage = (message) => this._handleMessage(message);
        this._sock.onclose = () => {
            console.log('Bye!');
        };

        Logger.set_socket(this._sock);
    }

    selectGeneralRoom() {
        this._roomManager.setActiveRoom(0);
    }

    sendChat(messageText) {
        if (Settings.activeLogType === 'room') {
            this._send({
                'type': 'chat message',
                'message': messageText,
                'room id': parseInt(Settings.activeLogId, 10)
            });
        }
        else {
            this._send({
                'type': 'private message',
                'message': messageText,
                'recipient id': Settings.activeLogId
            });
        }
    }

    setIdle(shouldBeIdle) {
        const isIdle = this._userManager.getUserStatus(Settings.userId) === 'idle';
        if (isIdle === undefined) {
            return;
        }
        if (shouldBeIdle && !isIdle) {
            this._send({
                'type': 'status',
                'status': 'idle'
            });
        }
        else if (!shouldBeIdle && isIdle) {
            this._send({
                'type': 'status',
                'status': 'active'
            });
        }
    }

    sendImage(imageUrl, nsfw) {
        this._send({
            'type': 'image',
            'image url': imageUrl,
            'nsfw': nsfw,
            'room id': Settings.activeLogId
        });
    }

    createRoom(roomName) {
        this._send({
            'type': 'room action',
            'action': 'create',
            'owner id': Settings.userId,
            'room name': roomName
        });
    }

    deleteRoom(roomId) {
        this._send({
            'type': 'room action',
            'action': 'delete',
            'room id': roomId
        });
    }

    leaveRoom(roomId) {
        this._send({
            'type': 'room action',
            'action': 'leave',
            'room id': roomId
        });
    }

    sendInvitations(roomId, userIds) {
        this._send({
            'type': 'room action',
            'action': 'invite',
            'room id': roomId,
            'user ids': userIds
        });
    }

    submitBug(bugData) {
        this._send({
            'type': 'bug',
            ...bugData
        });
    }

    submitFeature(featureData) {
        this._send({
            'type': 'feature',
            ...featureData
        });
    }

    updateUserSettings({username, color, faction}) {
        this._send({
            'type': 'settings',
            'data': {
                username,
                color,
                faction
            }
        });
    }

    updateClientSettings({volume, soundSet}) {
        this._send({
            'type': 'settings',
            'data': {
                volume,
                soundSet
            }
        });
    }

    updateAccountSettings({email, password1, password2}) {
        let password = {};
        if (password1 && password2) {
            password = {password: {password1, password2}};
        }
        this._send({
            'type': 'settings',
            'data': {
                email,
                ...password
            }
        });
    }

    joinRoom(roomId, accept = true, inviterId) {
        this._send({
            'type': 'room action',
            'action': 'join',
            'room id': roomId,
            accept,
            'inviter id': inviterId
        });
    }

    // Private functions

    _send(data) {
        this._sock.send(JSON.stringify({
            'user id': Settings.userId,
            ...data
        }));
    }

    _handleMessage({data: {data: messageData, type: messageType}}) {
        if (messageType === 'auth fail') {
            location.replace('/logout');
        }
        else if (messageType === 'version update') {
            this._receivedVersionUpdate(messageData);
        }
        else if (messageType === 'room data') {
            this._receivedRoomData(messageData);
        }
        else if (messageType === 'private message data') {
            this._receivedPrivateMessageData(messageData);
        }
        else if (messageType === 'user list') {
            this._receivedUserList(messageData);
        }
        else if (messageType === 'update') {
            this._receivedUpdate(messageData);
        }
        else if (messageType === 'chat message') {
            this._roomManager.addMessage(messageData, messageData['room id']);
        }
        else if (messageType === 'private message') {
            this._receivedPrivateMessage(messageData);
        }
        else if (messageType === 'alert') {
            this._receivedAlert(messageData);
        }
        else if (messageType === 'invitation') {
            this._receivedInvitation(messageData);
        }
    }

    _receivedVersionUpdate(messageData) {
        console.log(messageData);
    }

    _receivedRoomData({rooms, all}) {
        this._roomManager.addRooms(rooms, all);
    }

    _receivedPrivateMessageData({threads}) {
        this._userManager.addPrivateMessageThreads(threads);
    }

    _receivedUserList({users}) {
        this._userManager.updateUserList(users);
    }

    _receivedUpdate(messageData) {
        $.each(messageData, (key, value) => {
            Settings[key] = value;
            if (key === 'volume') {
                this._soundManager.updateVolume();
            }
            if (key === 'soundSet') {
                this._soundManager.updateSoundSet();
            }
        });
    }

    _receivedPrivateMessage(messageData) {
        this._userManager.addMessage(messageData);
    }

    _receivedInvitation({user, 'user id': userId, 'room id': roomId, 'room name': name}) {
        new Alert({
            content: `${user} is inviting you to join the room '${name}'.`,
            type: 'actionable',
            actionText: 'Join!',
            actionCallback: () => this.joinRoom(roomId, true, userId),
            dismissText: 'No, thanks.',
            dismissCallback: () => this.joinRoom(roomId, false, userId)
        });
    }

    _receivedAlert({message, alert_type}) {
        new Alert({content: message, type: alert_type});
        if (message.includes('offline')) {
            this._soundManager.playDisconnected();
        }
        else if (message.includes('online')) {
            this._soundManager.playConnected();
        }
    }
}
