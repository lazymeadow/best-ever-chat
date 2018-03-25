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
            'room id': Settings.activeRoom
        });
    }

    createRoom(roomName) {
        this._send({
            'type': 'room action',
            'action': 'create',
            'owner id': Settings.userId,
            'room name': roomName
        });
    }

    deleteRoom(roomId) {
        this._send({
            'type': 'room action',
            'action': 'delete',
            'room id': roomId
        });
    }

    leaveRoom(roomId) {
        this._send({
            'type': 'room action',
            'action': 'leave',
            'room id': roomId
        });
    }

    sendInvitations(roomId, userIds) {
        this._send({
            'type': 'room action',
            'action': 'invite',
            'room id': roomId,
            'user ids': userIds
        })
    }

    joinRoom(roomId) {
        this._send({
            'type': 'room action',
            'action': 'join',
            'room id': roomId
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
            this._roomManager.addMessage(messageData, messageData['room id']);
        }
        else if (messageType === 'private message') {
            this._receivedPrivateMessage(messageData);
        }
        else if (messageType === 'alert') {
            this._receivedAlert(messageData);
        }
        else if (messageType === 'invitation') {
            this._receivedInvitation(messageData);
        }
    }

    _receivedVersionUpdate(messageData) {
        console.log(messageData);
    }

    _receivedRoomData({rooms, all}) {
        this._roomManager.addRooms(rooms, all);
    }

    _receivedUserList({users}) {
        this._userManager.updateUserList(users);
    }

    _receivedUpdate(messageData) {
        console.log(messageData);
    }

    _receivedPrivateMessage(messageData) {
        console.log(messageData);
    }

    _receivedInvitation({user, 'room id': roomId, 'room name': name}) {
        new Modal({
            content: `${user} is inviting you to join the room '${name}. Will you join?'`,
            buttonText: 'Heck yes!',
            buttonClickHandler: () => this.joinRoom(roomId),
            showCancel: true,
            cancelText: 'No way!'
        })
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
