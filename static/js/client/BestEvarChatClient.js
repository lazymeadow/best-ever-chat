import SockJS from 'sockjs-client';
import {RoomManager} from "../rooms";
import {UserManager} from "../users";
import {Logger, Settings} from "../util";
import {Alert, MainMenu} from "../components";
import {CLIENT_VERSION} from "../lib";

export class BestEvarChatClient {
    constructor(hostname = 'localhost:6969', routingPath = 'newchat') {
        this._hostname = hostname;
        this._routingPath = routingPath;

        Settings.init();
        new MainMenu(this);

        this._roomManager = new RoomManager(this);
        this._userManager = new UserManager();

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

    sendChat(messageText) {
        this._send({
            'type': 'chat message',
            'message': messageText,
            'room id': Settings.activeRoom
        });
    }

    sendImage(imageUrl, nsfw) {
        this._send({
            'type': 'image',
            'image url': imageUrl,
            'nsfw': nsfw,
            'room id': Settings.activeRoom
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

    updateUserSettings() {
        this._send({
            'type': 'settings',
            'data': {
                username: Settings.username,
                color: Settings.color,
                faction: Settings.faction
            }
        });
    }

    updateClientSettings() {
        this._send({
            'type': 'settings',
            'data': {
                volume: Settings.volume,
                soundSet: Settings.soundSet
            }
        });
    }

    updateAccountSettings(password1, password2) {
        let password = {};
        if (password1 && password2) {
            password = {password: {password1, password2}};
        }
        this._send({
            'type': 'settings',
            'data': {
                email: Settings.email,
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
            location.reload();
        }
        else if (messageType === 'version update') {
            this._receivedVersionUpdate(messageData);
        }
        else if (messageType === 'room data') {
            this._receivedRoomData(messageData);
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

    _receivedUserList({users}) {
        this._userManager.updateUserList(users);
    }

    _receivedUpdate(messageData) {
        console.log(messageData);
    }

    _receivedPrivateMessage(messageData) {
        console.log(messageData);
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
    }
}
