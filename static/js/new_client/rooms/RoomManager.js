class RoomManager extends LoggingClass {
    constructor() {
        super();
        this._soundManager = new SoundManager();
        this._messageLog = new MessageLog(); // TODO move this into the room handler
        this._roomDataMap = new Map();
        this._roomListElement = $('#room-list');
    }


    // Public functions

    /**
     * Add rooms to the list. If the provided list is all rooms that are present in the chat, the list will be rebuilt.
     * @param rooms array of room data objects
     * @param allRooms flag to rebuild list
     */
    addRooms(rooms, allRooms = false) {
        super.debug('Updating rooms...');
        // clear the list if necessary
        if (allRooms) {
            this._roomListElement.children(':not(.rooms-header)').remove();
            this._roomDataMap.clear();
        }
        // add the room data to the list
        rooms.forEach((room) => this._addRoom(room));
        // select the active room. if the active room is not present, reset to 0
        if (!this._roomDataMap.has(Settings.activeRoom)) {
            Settings.activeRoom = 0;
        }
        this._roomDataMap.get(Settings.activeRoom).selectThisRoom();
        super.debug('Rooms updated.');
    }

    /**
     * Add a message to room history. If the roomId is not provided, it will be treated as a global message and added
     * to all rooms.
     * @param roomId the id of the room
     * @param messageData
     */
    addMessage(messageData, roomId = null) {
        if (roomId === null) {
            this._roomDataMap.forEach((room) => {
                room.addMessage(messageData, false);
            });
            this._messageLog.printMessage(messageData, false);
        }
        else {
            this._roomDataMap.get(roomId).addMessage(messageData);
            if (Settings.activeRoom === roomId) {
                this._messageLog.printMessage(messageData, true);
            }
        }
    }

    /**
     * Save the new roomId in the client settings, then repopulate the message log.
     * @param roomId
     */
    setActiveRoom(roomId) {
        Settings.activeRoom = roomId;
        this._messageLog.printMessages(this._roomDataMap.get(roomId).messageHistory);
        super.debug(`Active room set to ${roomId}.`);
    }

    // Private functions

    _addRoom(roomData) {
        let newRoom = new Room(roomData, this);
        this._roomDataMap.set(newRoom.id, newRoom);
        this._roomListElement.append(newRoom.template);
    }
}
