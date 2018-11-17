import {BestEvarChatClient} from "./BestEvarChatClient";
import {MainMenu} from "../components";
import {AdvancedRoomManager} from "../rooms/";

export class DesktopClient extends BestEvarChatClient {
    constructor() {
        super();
        new MainMenu(this);
        this._roomManager = new AdvancedRoomManager(this, this._messageLog, this._soundManager);
    }
}
