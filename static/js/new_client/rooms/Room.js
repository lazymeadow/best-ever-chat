class Room {
    constructor({name, owner, id, history}, roomManager) {
        this._roomManager = roomManager;

        this.name = name;
        this.isMine = owner === Settings.userId;
        this.id = id;
        this._messageHistory = history;

        // create a dom element for the room
        this._roomElement = Room._newRoomElement(this);
    }

    get messageHistory() {
        return this._messageHistory;
    }

    get template() {
        return this._roomElement;
    }

    addMessage(messageData) {
        this._messageHistory.push(messageData);
    }

    selectThisRoom() {
        this.template.click();
    }

    /**
     * Create a new jQuery element for the room list using the provided Room object.
     * @param room Room object
     * @returns {*|{trigger, _default}} jQuery element
     * @private
     */
    static _newRoomElement(room) {
        let roomElement = $('<div>');
        let elementBody = $('<div>')
            .append($('<span>').addClass('message-indicator fa fa-fw fa-comments-o'))
            .append($('<span>').addClass('list-content').text(room.name));

        if (room.id > 0) {
            let menu = $('<div>').addClass('inline-menu');
            let inviteItem = $('<span>').addClass('menu-item').text('Invite Users').prepend($('<span>').addClass('fa fa-fw fa-user-plus'));
            let removeItem = room.isMine ?
                $('<span>').addClass('menu-item').text('Delete Room').prepend($('<span>').addClass('fa fa-fw fa-trash-o')) :
                $('<span>').addClass('menu-item').text('Leave Room').prepend($('<span>').addClass('fa fa-fw fa-window-close-o'));
            menu.append(inviteItem).append(removeItem).hide();

            let menuButton = $('<span>').addClass('fa fa-fw fa-caret-down')
                .click((event) => {
                    event.stopPropagation();

                    // collapse all the other menus
                    let otherRows = roomElement.siblings();
                    otherRows.each((index, element) => {
                        // toggle the arrow directions
                        $(element).children().first()
                            .children(':not(.message-indicator):not(.list-content)').last()
                            .addClass('fa-caret-down').removeClass('fa-caret-up');
                        // hide the menus
                        $(element).children('.inline-menu').hide();
                    });

                    // toggle the arrow direction, then show the menu
                    menuButton.toggleClass('fa-caret-up fa-caret-down');
                    menu.toggle();
                });
            elementBody.append(menuButton);
            roomElement.append(menu);
        }

        return roomElement.prepend(elementBody)
            .click(() => {
                $('.current').removeClass('current');
                roomElement.addClass('current');
                room._roomManager.setActiveRoom(room.id);
            });
    }
}
