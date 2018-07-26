export class Logger {
    static set_socket(socket) {
        this._sock = socket;
    }

    static log(level, loggedFrom, message) {
        console.log(`${level.toUpperCase()}: ${loggedFrom.constructor.name.padEnd(15)} ${message}`);
        if (this._sock) {
            this._sock.send(JSON.stringify({
                'type': 'client log',
                'level': level,
                'log': `${loggedFrom.constructor.name.padEnd(15)} ${message}`
            }))
        }
    }
}
