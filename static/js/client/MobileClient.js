import {BestEvarChatClient} from "./BestEvarChatClient";
import {RoomManager} from "../rooms";
import {MainMenu} from "../components";

export class MobileClient extends BestEvarChatClient {
    constructor() {
        super();
        new MainMenu(this, {
            bugReport: true,
            featureRequest: true,
            about: true
        });
        this._roomManager = new RoomManager(this, this._messageLog, this._soundManager);
    }
}
