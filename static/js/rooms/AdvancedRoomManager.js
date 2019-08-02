import $ from 'jquery';
import {RoomManager} from "./RoomManager";
import {Modal} from "../components";

export class AdvancedRoomManager extends RoomManager {
    constructor(chatClient, messageLog, soundManager) {
        super(chatClient, messageLog, soundManager, 'AdvancedRoomManager');

        this.allowRoomEdits = true;

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

    notifyClient(metadata) {
        console.log('notifyClient', metadata);
        this._chatClient.sendNotification(`New Message in ${metadata.name}`, `from: ${metadata.user}`);
    }
}