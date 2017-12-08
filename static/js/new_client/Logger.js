class Logger {
    static set_socket(socket) {
        this._sock = socket;
    }

    static log(level, loggedFrom, message) {
        if (this._sock) {
            this._sock.send(JSON.stringify({
                'type': 'client log',
                'level': level,
                'log': `${loggedFrom.constructor.name.padEnd(15)} ${message}`
            }))
        }
    }
}

class LoggingClass {
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