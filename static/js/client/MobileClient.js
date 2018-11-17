import {BestEvarChatClient} from "./BestEvarChatClient";
import {RoomManager} from "../rooms";

export class MobileClient extends BestEvarChatClient {
    constructor() {
        super();
        this._roomManager = new RoomManager(this, this._messageLog, this._soundManager);
    }
}
