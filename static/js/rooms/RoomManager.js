import $ from 'jquery';
import {LoggingClass, Settings} from "../util";
import {Room} from "./Room";
import {_parseEmojis, setTitle} from '../lib';

export class RoomManager extends LoggingClass {
    constructor(messageLog) {
        super();
        // this._soundManager = new SoundManager();
        this._messageLog = messageLog;
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
        if (Settings.activeLogType === 'room') {
            if (!this._roomDataMap.has(Settings.activeLogId)) {
                Settings.activeLogId = '0';
            }
            this._roomDataMap.get(Settings.activeLogId).selectThisRoom();
        }
        super.debug('Rooms updated.');
        _parseEmojis(this._roomListElement[0]);
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
            this._roomDataMap.get(roomId.toString()).addMessage(messageData, messageData.username !== Settings.username);
            if (Settings.activeLogType === 'room' && Settings.activeLogId === roomId.toString()) {
                this._messageLog.printMessage(messageData);
            }
        }
    }

    /**
     * Save the new roomId in the client settings, then repopulate the message log.
     * @param roomId
     */
    setActiveRoom(roomId) {
        Settings.activeLogType = 'room';
        Settings.activeLogId = roomId.toString();
        let room = this._roomDataMap.get(roomId.toString());
        this._messageLog.printMessages(room.messageHistory);
        setTitle(room.name);
        super.debug(`Active room set to ${roomId}.`);
    }

    // Private functions

    _addRoom(roomData) {
        if (this._roomDataMap.has(roomData.id.toString())) {
            const room = this._roomDataMap.get(roomData.id.toString());
            $.merge(room.messageHistory, roomData.history);
            room.memberList = new Set(roomData.members);
            this.debug(`Room '${roomData.name}' added.`);
        }
        else {
            const newRoom = new Room(roomData, this);
            this._roomDataMap.set(newRoom.id.toString(), newRoom);
            this._roomListElement.append(newRoom.template);
            this.debug(`Room '${roomData.name}' updated.`);
        }
    }
}
