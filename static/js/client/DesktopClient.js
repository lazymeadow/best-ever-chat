import {BestEvarChatClient} from "./BestEvarChatClient";
import {MainMenu} from "../components";

export class DesktopClient extends BestEvarChatClient {
    constructor() {
        super();
        new MainMenu(this);
    }
}