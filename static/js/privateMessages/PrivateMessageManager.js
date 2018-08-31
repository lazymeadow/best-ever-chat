import {LoggingClass} from "../util";

export class PrivateMessageManager extends LoggingClass {
    constructor(messageLog) {
        super();
        this._messageLog = messageLog;
        this._privateMessageThreadMap = new Map();
    }

    addRooms(threads) {
        super.debug('Updating private messages...');
        console.log(threads);
    }

    addMessage(messageData, threadId) {

    }


}