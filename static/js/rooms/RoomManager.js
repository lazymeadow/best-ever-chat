import $ from 'jquery';
import {LoggingClass, Settings} from "../util";
import {Room} from "./Room";
import {_parseEmojis, setTitle} from '../lib';
import {Modal} from "../components";

export class RoomManager extends LoggingClass {
    constructor(chatClient, messageLog, soundManager) {
        super();
        this._chatClient = chatClient;
        this._messageLog = messageLog;
        this._soundManager = soundManager;
        this._roomDataMap = new Map();
        this._roomListElement = $('#room-list');

        // open modal when clicking room +
        $('#add-room').click(() => {
            new Modal({
                content: $('<input>').prop('id', 'new-room-name').prop('placeholder', 'Room name'),
                title: 'Create a Room',
                buttonText: 'Create Room',
                buttonClickHandler: () => {
                    const roomName = $('#new-room-name').val();
                    if (roomName) {
                        chatClient.createRoom(roomName);
                    }
                }
            });
        });
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
            if (!this._roomDataMap.has(parseInt(Settings.activeLogId, 10))) {
                Settings.activeLogId = 0;
            }
            this._roomDataMap.get(parseInt(Settings.activeLogId, 10)).selectThisRoom();
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
            let currentRoomMessageCount = 0;
            this._roomDataMap.forEach((room, roomId) => {
                const messageCount = room.addMessage(messageData, false);
                if (Settings.activeLogType === 'room' && parseInt(Settings.activeLogId, 10) === parseInt(roomId, 10)) {
                    currentRoomMessageCount = messageCount;
                }
            });
            if (Settings.activeLogType === 'room') {
                if (currentRoomMessageCount <= 1) {
                    this._messageLog.clear();
                }
                this._messageLog.printMessage(messageData);
            }
        }
        else {
            const roomMessageCount = this._roomDataMap.get(parseInt(roomId, 10)).addMessage(messageData, messageData.username !== Settings.username);
            if (Settings.activeLogType === 'room' && parseInt(Settings.activeLogId, 10) === parseInt(roomId, 10)) {
                if (roomMessageCount <= 1) {
                    this._messageLog.clear();
                }
                this._messageLog.printMessage(messageData);
                if (messageData.username === Settings.username) {
                    this._soundManager.playSent();
                }
                else if (messageData.username !== 'Server') {
                    this._soundManager.playReceived();
                }
            }
        }
    }

    /**
     * Save the new roomId in the client settings, then repopulate the message log.
     * @param roomId
     */
    setActiveRoom(roomId) {
        Settings.activeLogType = 'room';
        Settings.activeLogId = parseInt(roomId, 10);
        let room = this._roomDataMap.get(parseInt(roomId, 10));
        this._messageLog.printMessages(room.messageHistory, 'There are no messages in this room. You should say something!');
        setTitle(room.name);
        this._chatClient.updateUserList();
        super.debug(`Active room set to ${roomId}.`);
    }

    // Private functions

    _addRoom(roomData) {
        if (this._roomDataMap.has(parseInt(roomData.id, 10))) {
            const room = this._roomDataMap.get(parseInt(roomData.id, 10));
            $.merge(room.messageHistory, roomData.history);
            room.memberList = new Set(roomData.members);
            this.debug(`Room '${roomData.name}' added.`);
        }
        else {
            const newRoom = new Room(roomData, this);
            this._roomDataMap.set(parseInt(newRoom.id, 10), newRoom);
            this._roomListElement.append(newRoom.template);
            this.debug(`Room '${roomData.name}' updated.`);
        }
    }
}
