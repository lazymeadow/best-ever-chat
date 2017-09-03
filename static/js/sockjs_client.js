var client_version = 50;

var sock, colorPicker;

var timeout = null;
var idleTimeout = null;
var reconnect_count = 0;
var MAX_RETRIES = 3;
var window_focus = document.hasFocus();

$(document).ready(function () {
    // initial hiding of elements
    $('#emoji-list').hide();
    $('#menu').hide();
    $('#userStats').hide();
    $('#connectError').hide();
    $('#imageInput').hide();
    $('#information').hide();
    $('#overlay').hide();

    // set idle listeners
    function resetIdleTimeout() {
        window.clearTimeout(idleTimeout);
        if (sock) {
            sock.send(JSON.stringify({
                'type': 'userStatus',
                'user': Cookies.get('username'),
                'status': {
                    'idle': false
                }
            }));
        }
        idleTimeout = window.setTimeout(function () {
            if (sock) {
                sock.send(JSON.stringify({
                    'type': 'userStatus',
                    'user': Cookies.get('username'),
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

    $('#email').val(Cookies.get('email'));
    $('input:radio[name=faction]').filter('[value={}]'.replace('{}', Cookies.get('faction'))).prop('checked', true);
    $('#toggle-sound').prop("checked", JSON.parse(Cookies.get('sounds')));

    colorPicker = bestColorPicker($('#color'));

    $('#update-user').validate(updateSettings);

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
            'url': imgUrl.val()
        }));
        imgUrl.val('');
        $('#chat_text').focus();
    }
}

var typingStatus, typingTimeout;

function updateTypingStatus(newStatus) {
    typingStatus = newStatus || $('#chat_text').val().length > 0;

    if (!typingTimeout) {
        sendTypingStatus();
        typingTimeout = window.setTimeout(function () {
            window.clearTimeout(typingTimeout);
            typingTimeout = false;
            if (typingStatus) {
                updateTypingStatus();
            }
        }, 500);
    }

    function sendTypingStatus() {
        sock.send(JSON.stringify({
            'type': 'userStatus',
            'user': Cookies.get('username'),
            'status': {
                'typing': typingStatus,
                'currentMessage': $('#chat_text').val()
            }
        }));
    }
}

function submitChat(event) {
    if (event.keyCode === 38) {
        if (Cookies.get('last_message') !== undefined) {
            $('#chat_text').val(Cookies.get('last_message'));
        }
    }
    if (event.keyCode === 13) {
        var chatText = $('#chat_text');
        updateTypingStatus(false);
        sock.send(JSON.stringify({
            'type': 'chatMessage',
            'user': Cookies.get('username'),
            'message': chatText.val()
        }));
        Cookies.set('last_message', chatText.val());
        chatText.val('');
        chatText.focus();
    }
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
            sock.send(JSON.stringify({'type': 'version', 'client_version': client_version}));
        };

        sock.onmessage = function (e) {
            var type = e.data.type;
            var data = e.data.data;
            // handle all the damn message types
            if (type === 'auth_fail') {
                print_message(data);

                window.setTimeout(function () {
                    location.reload();
                }, 1000);
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
                                toggleSounds();
                            }
                            if (updateKey === 'sound_set') {
                                chooseSoundSet();
                            }
                        }
                    }
                }
                print_message(data);
            }
            if (type === 'userList') {
                updateUserList(data);
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
            if (type === 'history') {
                sounds_setting = JSON.parse(Cookies.get('sounds'));
                Cookies.set('sounds', false);
                for (var message in data) {
                    if (data.hasOwnProperty(message))
                        print_message(data[message], true);
                }
                Cookies.set('sounds', sounds_setting);
            }
            if (type === 'chatMessage') {
                print_message(data);
            }
            if (type === 'privateMessage') {
                print_private_message(data);
            }
            twemoji.parse(document.body, {
                base: '/static/',
                folder: 'emojione/assets/',
                attributes: function (icon, variant) {
                    return {title: icon + variant};
                }
            });
        };
        sock.onclose = function () {
            print_message({
                user: 'Client',
                time: moment().unix(),
                message: 'Connection lost!!'
            });

            if (reconnect_count === 0) {
                toggleModal('connectError');
            }
            else {
                attempt_reconnect();
            }
        };
    }
}

function attempt_reconnect() {
    if (reconnect_count === 0) {
        toggleModal('connectError');
    }
    window.clearTimeout(timeout);
    if (reconnect_count < MAX_RETRIES)
        timeout = window.setTimeout(reconnect, 1000);
    else {
        print_message({
            user: 'Client',
            time: moment().unix(),
            message: 'Reconnect failed.'
        });
        toggleModal('connectError');
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

function updateUserList(newList) {
    var userList = $('#user_list');
    userList.empty();
    for (var user in newList) {
        if (newList.hasOwnProperty(user)) {
            var userDiv = $('<div/>').text(user).attr('title', newList[user]['real_name']);
            if (newList[user]['typing']) {
                userDiv.append($('<i>').addClass('typing fa fa-fw fa-commenting-o'));
            }
            var activeIcon = $('<i>').addClass('fa fa-fw').addClass('fa-' + newList[user].faction);
            activeIcon.addClass(newList[user]['idle'] ? 'idle' : 'active');
            userDiv.prepend(activeIcon);
            userList.append(userDiv);
        }
    }
}

function setUsername() {
    var username_cookie = Cookies.get("username");
    if (username_cookie)
        $("#set_name").val(username_cookie);

    var color_cookie = Cookies.get("color");
    if (color_cookie) {
        colorPicker.setColor(color_cookie);
    }

    if (!Cookies.get('sounds')) {
        $("#sounds_toggle").prop("checked", false);
    }
    else {
        $("#sounds_toggle").prop("checked", JSON.parse(Cookies.get('sounds')));
    }

    toggleModal('userStats');
}

function showUsername() {
    var username = Cookies.get("username");
    if (username) {
        $("#username_display").text(" " + username + ":");
    }
    else
        setUsername();
}

var updateSettings = {
    rules: {
        set_name: {
            required: true,
            remote: {
                url: '/validate_username',
                type: 'post',
                data: {
                    username: function () {
                        return Cookies.get('username');
                    },
                    _xsrf: function () {
                        return Cookies.get('_xsrf');
                    }
                }
            },
            minlength: 1,
            maxlength: 16
        },
        color: {
            required: true
        },
        new_password: {
            required: false,
            minlength: 3
        },
        new_password2: {
            equalTo: '#new_password'
        },
        email: {
            required: false
        }
    },
    messages: {
        set_name: {
            remote: "Invalid name."
        }
    },
    submitHandler: function () {
        var username = Cookies.get("username");
        var data = {};
        var setName = $("#set_name");
        if (setName.val() !== '' && setName.val() !== username) {
            data.newUser = setName.val();
            data.oldUser = Cookies.get('username');
        }
        var color = Cookies.get("color");
        if (colorPicker.val() !== color) {
            data.newColor = $("#color").val();
        }
        var sounds = $('#toggle-sound').is(':checked');
        if (sounds !== JSON.parse(Cookies.get('sounds'))) {
            data.newSounds = sounds;
        }
        var soundSet = $('input[name="sounds-radios"]:checked').val();
        if (soundSet !== Cookies.get('sound_set')) {
            data.newSoundSet = soundSet;
        }
        var faction = $('input[name="faction"]:checked').val();
        if (faction !== Cookies.get('faction')) {
            data.newFaction = faction;
        }
        var email = $('#email').val();
        if (email !== '' && email !== Cookies.get('email')) {
            data.newEmail = email;
        }

        var newPassword = $("#new_password");
        var newPassword2 = $("#new_password2");
        if (newPassword.val() !== '' && newPassword.val() === newPassword2.val()) {
            sock.send(JSON.stringify({
                'type': 'password_change',
                'data': [newPassword.val(), newPassword.val()],
                'user': username
            }));
            newPassword.val('');
            newPassword2.val('');
        }

        if (data.newUser || data.newEmail || data.newFaction || data.newColor || data.newSoundSet || data.newSounds !== undefined) {
            if (!sock) connect();
            sock.send(JSON.stringify({
                'type': 'userSettings',
                'settings': data,
                'user': username
            }));
        }
        else {
            print_message({
                user: "Client",
                message: "No changes made",
                time: moment().unix()
            });
        }

        toggleModal('userStats');
    }
};


var numMessages = 0;

function print_private_message(msg) {
    var chatLog = $('#log');

    var date = $('<em />').addClass('text-muted')
        .text(moment.unix(msg.time).format("MM/DD/YY HH:mm:ss "));
    var salutation = '[message ' + (msg.sender === Cookies.get('username') ? 'to ' + msg.recipient : 'from ' + msg.sender) + '] ';
    var message = $('<span />')
        .append($('<em />')
            .append($('<strong />').text(salutation))
            .append($('<span />').html(msg.message)))
        .addClass('private-message');
    chatLog.append($('<div />')
        .append(date)
        .append(message).html() + '<br />');
    chatLog.scrollTop(document.getElementById('log').scrollHeight);
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
}

function print_message(msg, ignoreCount) {
    var chatLog = $('#log');
    var date = $('<em />').addClass('text-muted').text(moment.unix(msg.time).format("MM/DD/YY HH:mm:ss "));
    var message = $('<span />').append($('<strong />').text('<' + msg.user + '> ')).append($('<span />').html(msg.message));
    if (msg.color)
        message.css('color', msg.color);
    if (msg.user === 'Server') {
        message.addClass('server-message');
    }
    if (msg.user === 'Client') {
        message.addClass('client-message');
    }
    chatLog.append($('<div />').append(date).append(message).html() + '<br />');
    chatLog.scrollTop(document.getElementById('log').scrollHeight);
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
}

function toggleMenu() {
    var menu = $('#menu');
    if (menu.is(':visible'))
        menu.hide();
    else
        menu.show();
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
