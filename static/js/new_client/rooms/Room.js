class Room {
    constructor({name, owner, id, history, members: memberList}, roomManager) {
        this._roomManager = roomManager;

        this.name = name;
        this.isMine = owner === Settings.userId;
        this.id = id;
        this.memberList = memberList;
        this._messageHistory = history;

        // create a dom element for the room
        this._roomElement = this._createRoomElement();
    }

    get messageHistory() {
        return this._messageHistory;
    }

    get template() {
        return this._roomElement;
    }

    addMessage(messageData, show_indicator = true) {
        this._messageHistory.push(messageData);
        if (show_indicator && Settings.activeRoom !== this.id) {
            this._roomElement.addClass('has-messages');
        }
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
    _createRoomElement() {
        let roomElement = $('<div>');
        let elementBody = $('<div>')
            .append($('<span>').addClass('message-indicator fa fa-fw fa-comments-o'))
            .append($('<span>').addClass('list-content').text(this.name));

        if (this.id > 0) {
            let menu = $('<div>').addClass('inline-menu');
            let inviteItem = $('<span>').addClass('menu-item').text('Invite Users').prepend($('<span>').addClass('fa fa-fw fa-user-plus'))
                .click(() => {
                    new Modal({
                        content: () => {
                            // create a list of users that are NOT currently in the room
                            const currentUsers = this.memberList;
                            const eligibleUsers = this._roomManager._roomDataMap.get(0).memberList
                                .filter(function (username) {
                                    return !currentUsers.includes(username);
                                });
                            // add a checkbox for each user
                            const userCheckboxes = [];
                            $.each(eligibleUsers, function (_, username) {
                                userCheckboxes.push($('<div>').addClass('form-group')
                                    .append($('<input>').prop('type', 'checkbox')
                                        .prop('id', username)
                                        .prop('value', username)
                                        .prop('name', 'invitee'))
                                    .append($('<label>').addClass('check-box').prop('for', username))
                                    .append($('<span>').addClass('label').text(username)))
                            });
                            return $('<label>').text('Which users?').append(userCheckboxes);
                        },
                        buttonText: 'Yes!',
                        buttonClickHandler: () => client.sendInvitations(this.id, $('input[name="invitee"]:checked').map((index, element) => element.value).get())
                    });
                });
            let removeItem = this.isMine ?
                $('<span>').addClass('menu-item').text('Delete Room').prepend($('<span>').addClass('fa fa-fw fa-trash-o'))
                    .click(() => {
                        new Modal({
                            content: $('<div>')
                                .append($('<div>').text(`Are you sure you want to delete '${this.name}'?`))
                                .append($('<div>').text('All users will be kicked out and all history will be lost.'))
                                .append($('<div>').addClass('text-danger').text('This action is irreversible.')),
                            buttonText: 'Yes!',
                            buttonClickHandler: () => client.deleteRoom(this.id)
                        });
                    }) :
                $('<span>').addClass('menu-item').text('Leave Room').prepend($('<span>').addClass('fa fa-fw fa-window-close-o'))
                    .click(() => {
                        new Modal({
                            content: $('<div>')
                                .append($('<div>').text(`Are you sure you want to leave '${this.name}'?`)),
                            buttonText: 'Yes!',
                            buttonClickHandler: () => client.leaveRoom(this.id)
                        });
                    });
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
                roomElement.removeClass('has-messages');
                this._roomManager.setActiveRoom(this.id);
            });
    }
}
