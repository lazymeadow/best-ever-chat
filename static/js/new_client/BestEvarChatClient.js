class BestEvarChatClient {
    constructor(hostname = 'localhost:6969', routingPath = 'chat') {
        this._hostname = hostname;
        this._routingPath = routingPath;
        this._roomManager = new RoomManager();

        this.connect();
    }

    // Public functions

    connect() {
        this._sock = new SockJS(`http://${this._hostname}/${this._routingPath}/`);

        this._sock.onopen = () => {
            this._send({'type': 'version', 'client version': CLIENT_VERSION});
        };
        this._sock.onmessage = (message) => this._handleMessage(message);
        this._sock.onclose = () => {
            console.log('Bye!');
        };
    }

    sendChat(messageText) {
        this._send({
            'type': 'chat message',
            'user': Settings.username,
            'message': messageText,
            'room': Settings.activeRoom
        });
    }

    // Private functions

    _send(data) {
        this._sock.send(JSON.stringify(data));
    }

    _handleMessage({data: {data: messageData, type: messageType}}) {
        if (messageType === 'auth fail') {
            location.reload();
        }
        else if (messageType === 'version update') {
            this._receivedVersionUpdate(messageData);
        }
        else if (messageType === 'room data') {
            this._receivedRoomData(messageData);
        }
        else if (messageType === 'user list') {
            this._receivedUserList(messageData);
        }
        else if (messageType === 'update') {
            this._receivedUpdate(messageData);
        }
        else if (messageType === 'chat message') {
            this._receivedChatMessage(messageData);
        }
        else if (messageType === 'private message') {
            this._receivedPrivateMessage(messageData);
        }
        else if (messageType === 'delete room') {
            this._receivedDeleteRoom(messageData);
        }
    }

    _receivedVersionUpdate(messageData) {
        console.log(messageData);
    }

    _receivedRoomData({rooms, all}) {
        this._roomManager.addRooms(rooms, all);
    }

    _receivedUserList(messageData) {
        console.log(messageData);
    }

    _receivedUpdate(messageData) {
        console.log(messageData);
    }

    _receivedChatMessage(messageData) {
        this._roomManager.addMessage(messageData, messageData.room);
    }

    _receivedPrivateMessage(messageData) {
        console.log(messageData);
    }

    _received_invitation(messageData) {
        console.log(messageData);
    }

    _receivedDeleteRoom(messageData) {
        console.log(messageData);
    }
}
