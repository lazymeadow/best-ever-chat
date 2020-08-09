import {BestEvarChatClient} from "./BestEvarChatClient";
import {MainMenu} from "../components";
import {AdvancedRoomManager} from "../rooms/";
import {Settings} from "../util";

export class DesktopClient extends BestEvarChatClient {
    constructor() {
        super();
        this._mainMenu = new MainMenu(this, {
            clientSettings: true,
            userSettings: true,
            accountSettings: true,
            bugReport: true,
            featureRequest: true,
            about: true,
            moderatorTools: true,
            adminTools: true
        });
        this._mainMenu.init();
        this._roomManager = new AdvancedRoomManager(this, this._messageLog, this._soundManager, this._notificationManager);
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
