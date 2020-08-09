import $ from 'jquery';
import {BestEvarChatClient} from "./BestEvarChatClient";
import {RoomManager} from "../rooms";
import {MainMenu} from "../components";
import {Settings} from "../util";
import {_parseEmojis} from "../lib";

export class MobileClient extends BestEvarChatClient {
    constructor() {
        super();
        this._mainMenu = new MainMenu(this, {
            bugReport: true,
            featureRequest: true,
            about: true
        });
        this._mainMenu.init();
        this._roomManager = new RoomManager(this, this._messageLog, this._soundManager);
    }

    _getTitle() {
        $('#current-log-name').text(Settings.activeLogType === 'thread'
            ? this._userManager.getActiveThreadName()
            : this._roomManager.getActiveRoomName());

        _parseEmojis();

        return 'Best Evar Chat 3.0';
    }
}
