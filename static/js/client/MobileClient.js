import $ from 'jquery';
import {BestEvarChatClient} from "./BestEvarChatClient";

export class MobileClient extends BestEvarChatClient {
    constructor() {
        super();
        $('#logout').click(() => window.location = '/logout');
    }
}