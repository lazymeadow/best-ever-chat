function changeTab(tabSet, tabNum) {
    $('#' + tabSet + '_tabs .tab.active').removeClass('active');
    $('#' + tabSet + '_' + tabNum).addClass('active');
    $('#' + tabSet + ' .tab-content').hide();
    $('#' + tabSet + '_' + tabNum + '_content').show();
}

function removeTab(room_id) {
    if (active_room === room_id) {
        setActiveTab();
    }
    $('#room_' + room_id).remove();
}

function setActiveTab(event) {
    updateTypingStatus(false);  // set typing to false in current room
    var selectedTab;
    if (event) {
        if (!$(event.target).hasClass('tab')) return;
        active_room = event.target.room_id;
        selectedTab = $(event.target);
    }
    else {
        active_room = 0;
        selectedTab = $('#room_0');
    }
    localStorage.setItem('active_room', active_room);
    updateTypingStatus();  // updating to whatever typing status is current in new room
    $('#room_tabs .tab.active').removeClass('active');
    selectedTab.addClass('active');
    $('#log').empty();
    if (rooms[active_room].users)
        updateUserList(rooms[active_room].users);
    print_message_history(active_room);
    parse_emojis();
}

function createNewTab(room) {
    var newTab = $('<div>').addClass('tab').text(room['name'])
        .prop('id', 'room_' + room['id'])
        .prop('room_id', room['id'])
        .prop('title', room['name'])
        .click(setActiveTab);
    if (room['id'] > 0) {
        var menuButton = $('<span>').addClass('fa fa-fw fa-ellipsis-h')
            .prop('room_id', room['id']);
        newTab.append(menuButton);
        menu(menuButton,
            {
                menuId: 'tab_menu_' + room['id'],
                menuItems: [
                    {
                        iconClass: 'fa fa-fw fa-user-plus',
                        name: 'Invite Users',
                        id: 'invite_' + room['id'],
                        callback: function () {
                            toggleMenu($(event.target).parents('.menu').prop('id'));
                            var room_id = $(event.target).parents('.tab').prop('room_id');
                            dynamic_modal({
                                title: 'Invite Users',
                                content: $('<div>').addClass('form-group')
                                    .append($('<label>').text('Which users?'))
                                    .append(function () {
                                        // create a list of users that are NOT currently in the room
                                        var currentUsers = rooms[room_id]['users'].map(function (user) {
                                            return user['username'];
                                        });
                                        var eligibleUsers = rooms[0]['users'].map(function (user) {
                                            return user['username'];
                                        }).filter(function (username) {
                                            return !currentUsers.includes(username);
                                        });
                                        // add a checkbox for each user
                                        var userCheckboxes = [];
                                        $.each(eligibleUsers, function (_, username) {
                                            userCheckboxes.push($('<div>').addClass('form-group')
                                                .append($('<span>').addClass('label').text(username))
                                                .append($('<input>').prop('type', 'checkbox')
                                                    .prop('id', username)
                                                    .prop('value', username)
                                                    .prop('name', 'invitee'))
                                                .append($('<label>').addClass('check-box').prop('for', username)))
                                        });
                                        return userCheckboxes;
                                    }),
                                callback: function () {
                                    sock.send(JSON.stringify({
                                        'type': 'roomInvitation',
                                        'room_id': room_id,
                                        'user': Cookies.get('username'),
                                        'invitees': $('input[name="invitee"]:checked').map(function () {
                                            return this.value;
                                        }).get()
                                    }));
                                },
                                submitText: 'Send invitations'
                            });
                        }
                    },
                    {
                        iconClass: 'fa fa-fw fa-window-close-o',
                        name: 'Leave Room',
                        callback: function (event) {
                            toggleMenu($(event.target).parents('.menu').prop('id'));
                            var room_id = $(event.target).parents('.tab').prop('room_id');
                            removeTab(room_id);
                            delete rooms[room_id];
                            sock.send(JSON.stringify({
                                'type': 'leaveRoom',
                                'data': room_id,
                                'user': Cookies.get('username')
                            }));
                        }
                    },
                    {
                        iconClass: 'fa fa-fw fa-trash',
                        name: 'Delete Room',
                        disabled: room['owner'] !== Cookies.get('id'),
                        callback: function () {
                            toggleMenu($(event.target).parents('.menu').prop('id'));
                            var room_id = $(event.target).parents('.tab').prop('room_id');
                            dynamic_modal({
                                title: 'Delete Room',
                                content: $('<div>')
                                    .append($('<div>').text('Are you sure you want to delete \'' + rooms[room_id]['name'] + '\'?'))
                                    .append($('<div>').text('All users will be kicked out and all history will be lost.'))
                                    .append($('<div>').addClass('text-danger').text('This action is irreversible.')),
                                callback: function () {
                                    sock.send(JSON.stringify({
                                        'type': 'deleteRoom',
                                        'data': room_id,
                                        'user': Cookies.get('username')
                                    }));
                                },
                                submitText: 'Delete it!'
                            });
                        }
                    }
                ]
            });
    }
    $('#create-room-button').before(newTab);
    rooms[room['id']] = room;
}
