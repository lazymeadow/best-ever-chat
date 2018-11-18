class Logger {
    static set_socket(socket) {
        this._sock = socket;
    }

    static log(level, loggedFrom, message) {
        if (this._sock && this._sock.readyState === 1) {  // SockJS.OPEN
            this._sock.send(JSON.stringify({
                'type': 'client log',
                'level': level,
                'log': `${loggedFrom.className.padEnd(15)} ${message}`
            }))
        }
    }
}

class LoggingClass {
    constructor(className) {
        this.className = className;
    }

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

export {
    Logger,
    LoggingClass
};
