var client_version = '2.1.0';
var HOST = 'localhost:6969';
var DEFAULT_TITLE = "Best evar chat 2.0!";

var sock, colorPicker;

var timeout = null;
var idleTimeout = null;
var reconnect_count = 0;
var MAX_RETRIES = 3;
var window_focus = document.hasFocus();
var rooms = {};
var active_room = localStorage.getItem('active_room') || 0;

$(document).ready(function () {
    // move all the cookies sent from the server into localstorage for use during session
    localStorage.setItem('username', Cookies.get('username'));
    localStorage.setItem('email', Cookies.get('email'));
    localStorage.setItem('color', Cookies.get('color'));
    localStorage.setItem('faction', Cookies.get('faction'));
    localStorage.setItem('sound_set', Cookies.get('sound_set'));
    localStorage.setItem('sounds', Cookies.get('sounds'));

    window.document.title = getPageTitle();
    // initial hiding of elements
    $('#emoji-list').hide();
    $('#main_menu').hide();
    $('#newRoom').hide();
    $('#imageInput').hide();
    $('#information').hide();
    $('#overlay').hide();
    $('#settings').hide();
    changeTab('settings', 0);
    changeTab('information', 0);

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
        window.document.title = getPageTitle();
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
    });

    $('#email').val(localStorage.getItem('email'));
    $('input:radio[name=faction]').filter('[value={}]'.replace('{}', localStorage.getItem('faction'))).prop('checked', true);

    colorPicker = bestColorPicker($('#color'));
    colorPicker.setColor(localStorage.getItem('color'));

    // local settings
    var fontSize = localStorage.getItem('fontSize') || '14px';
    $('#font-size').val(fontSize);
    $('body').css({fontSize: fontSize});
    $('#tab_title').val(getPageTitle());
    $('input:radio[name=timestamps]').filter('[value={}]'.replace('{}', localStorage.getItem('timestamps'))).prop('checked', true);
    $('#hidden_images').prop('checked', JSON.parse(localStorage.getItem('hideImages') || 'true'));
    $('#profamity_filter').prop('checked', JSON.parse(localStorage.getItem('profamity_filter') || 'false'));

    showUsername();

    timeout = window.setTimeout(connect, 500);
});

function getPageTitle() {
    return localStorage.getItem('tab_title') || DEFAULT_TITLE;
}

function logout() {
    window.location = '/logout';
}

function connect() {
    if (localStorage.getItem('username')) {

        sock = new SockJS('http://' + HOST + '/chat/');

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
            else if (type === 'update') {
                for (var updateKey in data.data) {
                    if (data.data.hasOwnProperty(updateKey)) {
                        if (localStorage.getItem(updateKey) !== data.data[updateKey]) {
                            localStorage.setItem(updateKey, data.data[updateKey]);
                            if (updateKey === 'email') {
                                $('#email').val(data.data[updateKey]);
                            }
                            if (updateKey === 'faction') {
                                $('input:radio[name=faction]').filter('[value={}]'.replace('{}',
                                    localStorage.getItem('faction'))).prop('checked', true);
                            }
                            if (updateKey === 'username') {
                                showUsername();
                            }
                            if (updateKey === 'sounds') {
                                $('#volume-slider').val(localStorage.getItem('sounds'));
                            }
                            if (updateKey === 'color') {
                                colorPicker.setColor(localStorage.getItem('color'));
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
            else if (type === 'userList') {
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
            else if (type === 'versionUpdate') {
                localStorage.removeItem('info_read');
            }
            else if (type === 'information') {
                if (!localStorage.getItem('info_read')) {
                    changeTab('information', 1);
                    toggleModal('information');
                    localStorage.setItem('info_read', true);
                }
            }
            else if (type === 'invitation') {
                dynamic_modal({
                    modalId: 'invitation',
                    title: 'You\'ve been invited to a room!',
                    content: $('<div>')
                        .append($('<div>').text('User ' + data['sender'] + ' is inviting you to join the room ' + data['room_name'] + '.'))
                        .append($('<div>').text('Would you like to join?')),
                    callback: function () {
                        sock.send(JSON.stringify({
                            'type': 'joinRoom',
                            'room_id': data['room_id'],
                            'user': localStorage.getItem('username')
                        }));
                    },
                    submitText: 'Yes!',
                    cancelText: 'No!'
                });
            }
            else if (type === 'deleteRoom') {
                var room_id = data.data.room_id;
                removeTab(room_id);
                delete rooms[room_id];
                rooms[0].history.push(data);
                print_message(data);
            }
            else if (type === 'room_data') {
                if (data.all)
                    $('#room_tabs .tab').remove();
                for (var i = 0; i < data.rooms.length; i++) {
                    var room = data.rooms[i];
                    createNewTab(room);
                }
                if (!rooms.hasOwnProperty(active_room)) {
                    active_room = 0;
                    localStorage.setItem('active_room', 0);
                }
                $('#room_' + active_room).click();
            }
            else if (type === 'chatMessage') {
                var roomData = data.room;
                if ($.isArray(roomData) && data.user === 'Server') {
                    for (var roomNum in roomData) {
                        if (rooms.hasOwnProperty(roomData[roomNum])) {
                            rooms[roomData[roomNum]].history.push(data);
                            $('#room_' + roomData[roomNum] + ':not(.active) .indicator').show();
                            if (parseInt(roomData[roomNum]) === active_room) {
                                print_message(data);
                            }
                        }
                    }
                    updateMessageCount();
                }
                else if (roomData === null) {
                    for (var key in rooms) {
                        rooms[key].history.push(data);
                    }
                    print_message(data);
                }
                else {
                    if (rooms.hasOwnProperty(roomData)) {
                        rooms[roomData].history.push(data);
                        $('#room_' + roomData + ':not(.active) .indicator').show();
                        if (roomData === active_room) {
                            print_message(data);
                        }
                    }
                    if (data.user !== localStorage.getItem('username')) {
                        updateMessageCount();
                    }
                }

            }
            else if (type === 'privateMessage') {
                data.type = 'privateMessage';
                for (var id in rooms) {
                    rooms[id].history.push(data);
                }
                print_private_message(data);
            }
            else if (type === 'bug') {
                bugModal(title);
            }
            else if (type === 'feature') {
                featureModal(title);
            }
        };

        sock.onclose = function () {
            print_message({
                user: 'Client',
                time: moment().unix(),
                message: 'Connection lost!!'
            });
            attempt_reconnect();
        };
    }
}

function attempt_reconnect() {
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
            modalId: 'connect_error',
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

function addEmoji(emoji) {
    var chatText = $('#chat_text');
    chatText.val(chatText.val() + emoji);
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
        if (localStorage.getItem('last_message') !== undefined) {
            $('#chat_text').val(localStorage.getItem('last_message'));
        }
    }
    if (event.which === 13) {
        var chatText = $('#chat_text');
        sock.send(JSON.stringify({
            'type': 'chatMessage',
            'user': localStorage.getItem('username'),
            'message': chatText.val(),
            'room': active_room
        }));
        localStorage.setItem('last_message', chatText.val());
        chatText.val('');
        chatText.focus();
    }
    updateTypingStatus();
}

function showImageInput() {
    dynamic_modal({
        modalId: 'image_chat',
        title: 'Enter Image URL',
        content: $('<div>').append($('<div>').addClass('form-group')
            .append($('<input>').prop('type', 'url')
                .prop('id', 'image_url')))
            .append($('<div>').addClass('form-group')
                .append($('<span>').addClass('label').text('NSFW?'))
                .append($('<input>').prop('type', 'checkbox').prop('id', 'nsfw_flag'))
                .append($('<label>').addClass('check-box')
                    .click(function () {
                        $('#nsfw_flag').click().is(':checked') ? $(this).addClass('checked') : $(this).removeClass('checked');
                        return false;
                    })
                )
            ),
        callback: function () {
            var imgUrl = $('#image_url').val();
            if (imgUrl) {
                sock.send(JSON.stringify({
                    'type': 'imageMessage',
                    'user': localStorage.getItem('username'),
                    'url': imgUrl,
                    'nsfw_flag': $('#nsfw_flag').is(':checked'),
                    'room': active_room
                }));
                $('#chat_text').focus();
            }
            else {
                print_message({
                    user: 'Client',
                    time: moment().unix(),
                    message: 'No image sent.'
                });
            }
        }
    });
    $('#image_url').focus();
}

function updateUserList() {
    var newList = rooms[active_room].users;
    var userList = $('#user_list');
    userList.empty();

    $.each(newList, function (index, user) {
        var userDiv = $('<div/>').attr('title', user['real_name']);
        if (user['typing']) {
            userDiv.append($('<span>').addClass('typing fa fa-fw fa-commenting-o'));
        }
        userDiv.append(user['username']);
        var activeIcon = $('<span>').addClass('fa fa-fw').addClass('fa-' + user.faction);
        activeIcon.addClass(user['idle'] ? 'idle' : 'active');
        userDiv.prepend(activeIcon);
        userList.append(userDiv);
    });
    parse_emojis(userList[0]);
}

function showUsername() {
    var username = localStorage.getItem("username");
    var usernameDisplay = $("#username_display");
    if (username) {
        usernameDisplay.text(username + ":");
        $("#set_name").val(username);
        parse_emojis(usernameDisplay[0]);
    }
}

function toggleEmojiList() {
    var emojiList = $('#emoji-list');
    if (emojiList.is(':visible'))
        emojiList.hide();
    else
        emojiList.show();
}

function createRoom() {
    dynamic_modal({
        modalId: 'new_room',
        title: 'Create Room',
        content: $('<div>')
            .append($('<div>').addClass('form-group')
                .append($('<label>').prop('for', 'room_name'))
                .append($('<input>').prop('id', 'room_name').prop('placeholder', 'Room name')))
            .append($('<div>').addClass('form-group')
                .append(function () {
                    // create a list of all users
                    var eligibleUsers = rooms[0]['users'].map(function (user) {
                        return user['username'];
                    }).filter(function (element) {
                        return element !== localStorage.getItem('username');
                    });

                    if (eligibleUsers.length === 0)
                        return;

                    // add a checkbox for each user
                    var userCheckboxes = [];
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
                })
            ),
        callback: function () {
            var data = {};
            data.name = $('#room_name').val();
            data.invitees = $('input[name="invitee"]:checked').map(function () {
                return this.value;
            }).get();

            sock.send(JSON.stringify({
                'type': 'newRoom',
                'data': data,
                'user': localStorage.getItem('username')
            }));
        },
        submitText: 'Create it!'
    });
}

function bugModal(title) {
    var title_input = $('<input>').val(title);
    var body_input = $('<textarea>');
    dynamic_modal({
        modalId: 'bug',
        title: 'Submit a bug',
        content: $('<div>')
            .append('You found a bug? Nice job!')
            .append($('<div>').addClass('form-group')
                .append($('<div>').addClass('form-element')
                    .append($('<label>').text('Title:'))
                    .append(title_input))
                .append($('<div>').addClass('form-element')
                    .append($('<label>').text('Description:'))
                    .append(body_input))),
        callback: function () {
            sock.send(JSON.stringify({
                type: 'bug',
                data: {
                    title: `[Best Evar Chat] ${title_input.val()} (submitted by ${Cookies.get('id')})`,
                    body: body_input.val()
                }
            }));
        },
        submitText: 'Send it in!',
        cancelText: 'Nevermind'
    });
}

function featureModal(title) {
    var title_input = $('<input>').val(title);
    var body_input = $('<textarea>');
    dynamic_modal({
        modalId: 'feature',
        title: "Feature request",
        content: $('<div>')
            .append('So, this chat isn\'t good enough for you? Fine! What do you want?')
            .append($('<div>').addClass('form-group')
                .append($('<div>').addClass('form-element')
                    .append($('<label>').text('Title:'))
                    .append(title_input))
                .append($('<div>').addClass('form-element')
                    .append($('<label>').text('Description:'))
                    .append(body_input))),
        callback: function () {
            sock.send(JSON.stringify({
                type: 'feature',
                data: {
                    title: `[Best Evar Chat] ${title_input.val()} (submitted by ${Cookies.get('id')})`,
                    body: ''
                }
            }));
        },
        submitText: 'Make it better!',
        cancelText: 'Just kidding'
    });
}
