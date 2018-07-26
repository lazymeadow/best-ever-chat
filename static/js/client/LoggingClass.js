import {Logger} from "./Logger";

export class LoggingClass {
    debug(message) {
        Logger.log('debug', this, message);
    }

    info(message) {
        Logger.log('info', this, message);
    }

    warning(message) {
        Logger.log('info', this, message);
    }

    error(message) {
        Logger.log('info', this, message);
    }

    critical(message) {
        Logger.log('info', this, message);
    }
}