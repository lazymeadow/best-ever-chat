import {BestEvarChatClient} from "./BestEvarChatClient";
import {MainMenu} from "../components";
import {AdvancedRoomManager} from "../rooms/";
import {Settings} from "../util";

export class ElectronClient extends BestEvarChatClient {
    constructor() {
        super();
        new MainMenu(this, {
            clientSettings: true,
            userSettings: true,
            accountSettings: true,
            bugReport: true,
            featureRequest: true,
            about: true,
            adminTools: true
        });
        this._roomManager = new AdvancedRoomManager(this, this._messageLog, this._soundManager);
    }

    _triggerEvent(type, data) {
        const myEvent = new CustomEvent(type, {detail: data});
        window.dispatchEvent(myEvent);
    }

    _send(data) {
        this._triggerEvent('BEC_send', data);
        super._send(data);
    }

    _handleMessage(data) {
        this._triggerEvent('BEC_receive', data);
        if (!document.hasFocus() && data.data.type === 'chat message' && data.data.data.username !== Settings.username) {
            this._triggerEvent('BEC_notify', {message: `New message in ${this._roomManager.getRoomName(data.data.data['room id'])}`});
        }
        super._handleMessage(data);
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

}
