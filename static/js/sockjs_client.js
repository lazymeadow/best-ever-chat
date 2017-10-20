var client_version = '2.0';

var sock, colorPicker;

var timeout = null;
var idleTimeout = null;
var reconnect_count = 0;
var MAX_RETRIES = 3;
var window_focus = document.hasFocus();
var rooms = {};
var active_room = 0;
var autoScroll = true;

$(document).ready(function () {
    // initial hiding of elements
    $('#emoji-list').hide();
    $('#main_menu').hide();
    $('#newRoom').hide();
    $('#imageInput').hide();
    $('#information').hide();
    $('#overlay').hide();
    $('#settings').hide();
    changeSettingsTab(0);

    // set idle listeners
    function resetIdleTimeout() {
        window.clearTimeout(idleTimeout);
        if (sock) {
            sock.send(JSON.stringify({
                'type': 'userStatus',
                'status': {
                    'idle': false
                }
            }));
        }
        idleTimeout = window.setTimeout(function () {
            if (sock) {
                sock.send(JSON.stringify({
                    'type': 'userStatus',
                    'status': {
                        'idle': true
                    }
                }));
            }
        }, 15 * 60 * 1000);  // fifteen minutes
    }

    $(document).mouseenter(resetIdleTimeout)
        .scroll(resetIdleTimeout)
        .keydown(resetIdleTimeout)
        .click(resetIdleTimeout)
        .dblclick(resetIdleTimeout);

    // page stuff
    $(window).focus(function () {
        numMessages = 0;
        window.document.title = "Best evar chat!";
        window_focus = true;

        $('#chat_text').focus();
        $("#favicon").attr("href", "/static/favicon.png");

        resetIdleTimeout();
    }).blur(function () {
        window_focus = false;
    });

    $('#log').scroll(function (event) {
        var log = $(event.target);
        var scrollThreshold = 100;  // approximately five lines
        autoScroll = Math.abs(log.outerHeight(true) + log.scrollTop() - log[0].scrollHeight) < scrollThreshold;
        console.log(autoScroll, log[0].scrollHeight);
    });

    $('#email').val(Cookies.get('email'));
    $('input:radio[name=faction]').filter('[value={}]'.replace('{}', Cookies.get('faction'))).prop('checked', true);

    colorPicker = bestColorPicker($('#color'));
    colorPicker.setColor(Cookies.get('color'));

    var fontSize = Cookies.get('fontSize') || '14px';
    $('#font-size').val(fontSize);
    $('body').css({fontSize: fontSize});

    $('#hidden_images').prop('checked', true);

    showUsername();

    timeout = window.setTimeout(connect, 500);
});

function addEmoji(emoji) {
    var chatText = $('#chat_text');
    chatText.val(chatText.val() + emoji);
}

function showImageInput() {
    toggleModal('imageInput');
}

function imageChat() {
    var imgUrl = $('#img_url');
    if (imgUrl.val()) {
        toggleModal('imageInput');
        sock.send(JSON.stringify({
            'type': 'imageMessage',
            'user': Cookies.get('username'),
            'url': imgUrl.val(),
            'nsfw_flag': $('#nsfw_flag').is(':checked'),
            'room': active_room
        }));
        imgUrl.val('');
        $('#chat_text').focus();
    }
}

function updateTypingStatus(newStatus) {
    if (newStatus === undefined) {
        currentMessage = $('#chat_text').val();
        sock.send(JSON.stringify({
            'type': 'userStatus',
            'status': {
                'typing': currentMessage.length > 0,
                'currentMessage': currentMessage,
                'room': active_room
            }
        }));
    }
    else {
        sock.send(JSON.stringify({
            'type': 'userStatus',
            'status': {
                'typing': newStatus,
                'room': active_room
            }
        }));
    }
}

function submitChat(event) {
    if (event.which === 38) {
        if (Cookies.get('last_message') !== undefined) {
            $('#chat_text').val(Cookies.get('last_message'));
        }
    }
    if (event.which === 13) {
        var chatText = $('#chat_text');
        sock.send(JSON.stringify({
            'type': 'chatMessage',
            'user': Cookies.get('username'),
            'message': chatText.val(),
            'room': active_room
        }));
        Cookies.set('last_message', chatText.val());
        chatText.val('');
        chatText.focus();
    }
    updateTypingStatus();
}

function logout() {
    window.location = '/logout';
}

function connect() {
    if (Cookies.get('username')) {

        // socket stuff
        //sock = new SockJS('http://chat.applepeacock.com/chat/');
        sock = new SockJS('http://localhost:6969/chat/');

        sock.onopen = function () {
            window.clearTimeout(timeout);
            timeout = null;
            reconnect_count = 0;

            $('#room_tabs .tab').remove();

            sock.send(JSON.stringify({'type': 'version', 'client_version': client_version}));
        };

        sock.onmessage = function (e) {
            var type = e.data.type;
            var data = e.data.data;
            // handle all the damn message types
            if (type === 'auth_fail') {
                location.reload();
            }
            if (type === 'update') {
                for (var updateKey in data.data) {
                    if (data.data.hasOwnProperty(updateKey)) {
                        if (Cookies.get(updateKey) !== data.data[updateKey]) {
                            Cookies.set(updateKey, data.data[updateKey]);
                            if (updateKey === 'email') {
                                $('#email').val(data.data[updateKey]);
                            }
                            if (updateKey === 'faction') {
                                $('input:radio[name=faction]').filter('[value={}]'.replace('{}',
                                    Cookies.get('faction'))).prop('checked', true);
                            }
                            if (updateKey === 'username') {
                                showUsername();
                            }
                            if (updateKey === 'sounds') {
                                $('#volume-slider').val(Cookies.get('sounds'));
                            }
                            if (updateKey === 'color') {
                                colorPicker.setColor(Cookies.get('color'));
                            }
                            if (updateKey === 'sound_set') {
                                chooseSoundSet();
                            }
                        }
                    }
                }

                // update messages can go in all rooms
                for (key in rooms) {
                    rooms[key].history.push(data);
                }
                print_message(data);
            }
            if (type === 'userList') {
                var room_num = data.room;
                if (rooms.hasOwnProperty(room_num)) {
                    rooms[room_num].users = [];
                    $.each(data.users, function (username, user) {
                        user.username = username;
                        rooms[room_num].users.push(user);
                    });
                    rooms[room_num].users.sort(function (a, b) {
                        var nameA = a.username.toUpperCase();  // ignore upper and lowercase
                        var nameB = b.username.toUpperCase();  // ignore upper and lowercase
                        if (nameA < nameB) {
                            return -1;
                        }
                        if (nameA > nameB) {
                            return 1;
                        }
                        // names must be equal
                        return 0;
                    });
                    // if the user list contains all connected users, then disable the invite item
                    if ((rooms[room_num].users.length === rooms[0].users.length) &&
                        rooms[room_num].users.every(function (element, index) {
                            return element.username === rooms[0].users[index].username;
                        })
                    ) {
                        $('#invite_' + room_num).addClass('disabled');
                    }
                    else {
                        $('#invite_' + room_num).removeClass('disabled');
                    }
                    if (room_num === active_room)
                        updateUserList();
                }
            }
            if (type === 'versionUpdate') {
                Cookies.remove('info_read');
            }
            if (type === 'information') {
                if (!Cookies.get('info_read')) {
                    $('#information_content').html(data.message);
                    toggleModal('information');
                }
            }
            if (type === 'invitation') {
                dynamic_modal({
                    title: 'You\'ve been invited to a room!',
                    content: $('<div>')
                        .append($('<div>').text('User ' + data['sender'] + ' is inviting you to join the room ' + data['room_name'] + '.'))
                        .append($('<div>').text('Would you like to join?')),
                    callback: function () {
                        sock.send(JSON.stringify({
                            'type': 'joinRoom',
                            'room_id': data['room_id'],
                            'user': Cookies.get('username')
                        }));
                    },
                    submitText: 'Yes!',
                    cancelText: 'No!'
                });
            }
            if (type === 'deleteRoom') {
                var room_id = data.data.room_id;
                removeTab(room_id);
                delete rooms[room_id];
                print_message(data)
            }
            if (type === 'room_data') {
                for (var i = 0; i < data.length; i++) {
                    var room = data[i];
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
                                    // {
                                    //     iconClass: 'fa fa-fw fa-volume-off',
                                    //     name: 'Mute Room',
                                    //     callback: function (event) {
                                    //         toggleMenu($(event.target).parents('.menu').prop('id'));
                                    //         console.log('muting room', $(event.target).parents('.tab').prop('room_id'));
                                    //         // TODO mute the room
                                    //     }
                                    // },
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
                $('#room_' + active_room).click();
            }
            if (type === 'chatMessage') {
                var roomNum = data.room;
                if (roomNum === null) {
                    for (var key in rooms) {
                        rooms[key].history.push(data);
                    }
                    print_message(data);
                }
                else {
                    if (rooms.hasOwnProperty(roomNum)) {
                        rooms[roomNum].history.push(data);
                        if (roomNum === active_room) {
                            print_message(data);
                        }
                    }
                }
            }
            if (type === 'privateMessage') {
                data.type = 'privateMessage';
                for (var id in rooms) {
                    rooms[id].history.push(data);
                }
                print_private_message(data);
            }
        };
        sock.onclose = function () {
            print_message({
                user: 'Client',
                time: moment().unix(),
                message: 'Connection lost!!'
            });

            if (reconnect_count === 0) {
                dynamic_modal({
                    title: 'Connection Error',
                    content: 'There was an error connecting to the server.',
                    callback: attempt_reconnect,
                    showCancel: false,
                    submitText: 'Retry'
                });
            }
            else {
                attempt_reconnect();
            }
        };
    }
}

function parse_emojis(element) {
    twemoji.parse(element || document.body, {
        base: '/static/',
        folder: 'emojione/assets/',
        attributes: function (icon, variant) {
            return {title: icon + variant};
        }
    });
}

function attempt_reconnect() {
    // if (reconnect_count === 0) {
    //     dynamic_modal({
    //         title: 'Connection Error',
    //         content: 'There was an error connecting to the server.',
    //         callback: attempt_reconnect,
    //         showCancel: false,
    //         submitText: 'Retry'
    //     });
    // }
    window.clearTimeout(timeout);
    if (reconnect_count < MAX_RETRIES)
        timeout = window.setTimeout(reconnect, 1000);
    else {
        print_message({
            user: 'Client',
            time: moment().unix(),
            message: 'Reconnect failed.'
        });
        dynamic_modal({
            title: 'Connection Error',
            content: 'There was an error connecting to the server.',
            callback: attempt_reconnect,
            showCancel: false,
            submitText: 'Retry'
        });
        reconnect_count = 0;
    }
}

function reconnect() {
    connect();
    reconnect_count++;
    print_message({
        user: 'Client',
        time: moment().unix(),
        message: 'Attempting to reconnect to the server... (' + reconnect_count + '/' + MAX_RETRIES + ')'
    });
}

function updateUserList() {
    var newList = rooms[active_room].users;
    var userList = $('#user_list');
    userList.empty();

    $.each(newList, function (index, user) {
        var userDiv = $('<div/>').text(user['username']).attr('title', user['real_name']);
        if (user['typing']) {
            userDiv.append($('<span>').addClass('typing fa fa-fw fa-commenting-o'));
        }
        var activeIcon = $('<span>').addClass('fa fa-fw').addClass('fa-' + user.faction);
        activeIcon.addClass(user['idle'] ? 'idle' : 'active');
        userDiv.prepend(activeIcon);
        userList.append(userDiv);
    });
}

function showUsername() {
    var username = Cookies.get("username");
    if (username) {
        $("#username_display").text(username + ":");
        $("#set_name").val(username);
    }
}

var numMessages = 0;

function print_private_message(msg) {
    var chatLog = $('#log');
    var messageContainer = $('<div>').addClass('chat-message');
    var date = $('<div>').addClass('time text-muted').text('[{}]'.replace('{}', moment.unix(msg.time).format("MM/DD/YY HH:mm:ss")));
    var salutation = 'message ' + (msg.sender === Cookies.get('username') ? 'to ' + msg.recipient : 'from ' + msg.sender) + ': ';
    var message = $('<div>').addClass('message private-message')
        .append($('<strong />').text(salutation))
        .append($('<span />').html(msg.message));

    chatLog.append(messageContainer.append(date).append(message));
    messageContainer.imagesLoaded(function () {
        if (autoScroll) {
            chatLog.scrollTop(document.getElementById('log').scrollHeight);
        }
    });
    if (msg.user === Cookies.get('username')) {
        play_send();
    }
    else {
        if (msg.user !== 'Client') play_receive();
        if (!window_focus) {
            numMessages++;
            window.document.title = "(" + numMessages + ") Best ever chat!";
            $("#favicon").attr("href", "/static/favicon2.png");
        }
    }
    parse_emojis(messageContainer[0]);
}

function print_message(msg, ignoreCount) {
    if (!msg.hasOwnProperty('message') && msg.hasOwnProperty('image_url')) {
        var imageElement = $('<a>').prop('href', msg.image_url).prop('target', '_blank')
            .append($('<img>').prop('src', msg.image_src_url));
        var hide_images = JSON.parse(Cookies.get('hideImages') || 'true');
        hide_images ? imageElement.hide() : imageElement.show();
        msg.message = $('<div>').addClass('image-wrapper')
            .append($('<span>').text((hide_images ? 'show' : 'hide') + ' image' + (msg.nsfw_flag ? ' -- NSFW!' : '')).click(function (event) {
                var image_element = $(event.target).next();
                image_element.toggle();
                $(event.target).text((image_element.is(':visible') ? 'hide' : 'show') + ' image ' + (msg.nsfw_flag ? '-- NSFW!' : ''))
            }))
            .append(imageElement);
    }

    var chatLog = $('#log');
    var messageContainer = $('<div>').addClass('chat-message');
    var date = $('<div>').addClass('time text-muted').text('[{}]'.replace('{}', moment.unix(msg.time).format("MM/DD/YY HH:mm:ss")));
    var message = $('<div>').addClass('message').append($('<strong />').text(msg.user + ': ')).append($('<span />').html(msg.message));
    if (msg.color)
        message.css('color', msg.color);
    if (msg.user === 'Server') {
        message.addClass('server-message');
    }
    if (msg.user === 'Client') {
        message.addClass('client-message');
    }
    chatLog.append(messageContainer.append(date).append(message));
    messageContainer.imagesLoaded(function () {
        if (autoScroll) {
            chatLog.scrollTop(chatLog[0].scrollHeight);
        }
    });
    if (msg.user === 'Server') {
        if (msg.message.includes('disconnected')) play_disconnect();
        else if (msg.message.includes('connected') && !msg.message.includes(Cookies.get('username'))) {
            play_connect();
        }
    }
    else if (msg.user === Cookies.get('username')) {
        play_send();
    }
    else if (!ignoreCount) {
        if (msg.user !== 'Client') play_receive();
        if (!window_focus) {
            numMessages++;
            window.document.title = "(" + numMessages + ") Best ever chat!";
            $("#favicon").attr("href", "/static/favicon2.png");
        }
    }
    parse_emojis(messageContainer[0]);
}

function toggleEmojiList() {
    var emojiList = $('#emoji-list');
    if (emojiList.is(':visible'))
        emojiList.hide();
    else
        emojiList.show();
}

function dismissInformation() {
    Cookies.set('info_read', true);
    toggleModal('information');
}

function toggleModal(modalId) {
    var modal = $('#' + modalId);
    if (modal.is(':visible')) {
        modal.hide();
        if (!$('.modal').is(':visible')) {  // no other modals are open
            $('#overlay').hide();
        }
    }
    else {
        modal.show();
        $('#overlay').show();
    }
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
    updateTypingStatus();  // updating to whatever typing status is current in new room
    $('#room_tabs .tab.active').removeClass('active');
    selectedTab.addClass('active');
    $('#log').empty();
    if (rooms[active_room].users)
        updateUserList(rooms[active_room].users);
    print_message_history(active_room);
    parse_emojis();
}

function removeTab(room_id) {
    if (active_room === room_id) {
        setActiveTab();
    }
    $('#room_' + room_id).remove();
}

function print_message_history(room) {
    var history = rooms[room].history;
    $('audio').prop('muted', true);
    for (var message in history) {
        if (history.hasOwnProperty(message)) {
            if (history[message].type === 'privateMessage') {
                print_private_message(history[message]);
            }
            else {
                print_message(history[message], true);
            }
        }
    }
    $('audio').prop('muted', JSON.parse(Cookies.get('muted') || 'false'));
}

function changeSettingsTab(tabNum) {
    $('#settings_tabs .tab.active').removeClass('active');
    $('#settings_' + tabNum).addClass('active');
    $('#settings .tab-content').hide();
    $('#settings_' + tabNum + '_content').show();
}

