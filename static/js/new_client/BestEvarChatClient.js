class BestEvarChatClient {
    constructor(hostname = 'localhost:6969', routingPath = 'newchat') {
        this._hostname = hostname;
        this._routingPath = routingPath;
        this._roomManager = new RoomManager();
        this._userManager = new UserManager();

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

        Logger.set_socket(this._sock);
    }

    sendChat(messageText) {
        this._send({
            'type': 'chat message',
            'user id': Settings.userId,
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
            this._roomManager.addMessage(messageData, messageData.room);
        }
        else if (messageType === 'private message') {
            this._receivedPrivateMessage(messageData);
        }
        else if (messageType === 'delete room') {
            this._receivedDeleteRoom(messageData);
        }
        else if (messageType === 'alert') {
            this._receivedAlert(messageData);
        }
    }

    _receivedVersionUpdate(messageData) {
        console.log(messageData);
    }

    _receivedRoomData({rooms, all}) {
        this._roomManager.addRooms(rooms, all);
    }

    _receivedUserList({users}) {
        console.log('user list:', users);
        this._userManager.updateUserList(users);
    }

    _receivedUpdate(messageData) {
        console.log(messageData);
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

    _receivedAlert({message, alert_type}) {
        // create hidden alert
        let newAlert = $('<div>').text(message).hide();
        // append hidden alert
        let alertsBox = $('#alerts');
        alertsBox.prepend(newAlert);
        // slideDown alert
        newAlert.slideDown(500);
        // if previously empty, slideDown alerts box
        if (newAlert.is(':last-child')) {
            alertsBox.slideDown(500);
        }

        if (alert_type === 'fade') {
            // after timeout, slideUp alert. if empty, slide up box.
            window.setTimeout(() => {
                newAlert.slideUp(500, () => {
                    newAlert.remove();
                    if (alertsBox.is(':empty')) {
                        alertsBox.slideUp(500);
                    }
                });
            }, 3500);
        }
        else if (alert_type === 'dismiss') {
            // add a dismiss button
        }
    }
}
