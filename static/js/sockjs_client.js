client_version = 46;

var sock;
var colorpicker;

var timeout = null;
var reconnect_count = 0;
var MAX_RETRIES = 3;
var window_focus = true;

$(document).ready(function () {
    $('#emoji-list').hide();
    $('#userStats').hide();
    $('#connectError').hide();
    $('#imageInput').hide();
    $('#information').hide();
    $('#overlay').hide();
    // page stuff
    $(window).focus(function () {
        numMessages = 0;
        window.document.title = "Best evar chat!";
        window_focus = true;
        $('#chat_text').focus();
        $("#favicon").attr("href", "/static/favicon.png");
    }).blur(function () {
        window_focus = false;
    });

    colorpicker = bestColorPicker($('#color'));

    $('#update-user').validate(updateSettings);

    showUsername();

    timeout = window.setTimeout(connect, 500);
});

function addEmoji(emoji) {
    $('#chat_text').val($('#chat_text').val() + emoji);
}

function showImageInput() {
    toggleModal('imageInput');
}

function imageChat() {
    if ($('#img_url').val()) {
        toggleModal('imageInput');
        sock.send(JSON.stringify({
            'type': 'imageMessage',
            'user': Cookies.get('username'),
            'url': $('#img_url').val()
        }));
        $('#img_url').val('');
        $('#chat_text').focus();
    }
}

function submitChat(event) {
    if (event.keyCode === 38) {
        if (Cookies.get('last_message') !== undefined) {
            $('#chat_text').val(Cookies.get('last_message'));
        }
    }
    if (event.keyCode === 13) {
        sock.send(JSON.stringify({
            'type': 'chatMessage',
            'user': Cookies.get('username'),
            'message': $('#chat_text').val()
        }));
        Cookies.set('last_message', $('#chat_text').val());
        $('#chat_text').val('');
        $('#chat_text').focus();
    }
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
            if (type === 'userList') {
                updateUserList(data);
            }
            if (type === 'versionUpdate') {
                Cookies.remove('info_read');
            }
            if (type == 'information') {
                if (!Cookies.get('info_read')) {
                    $('#information_content').html(data.message);
                    toggleModal('information');
                }
            }
            if (type === 'history') {
                sounds_setting = JSON.parse(Cookies.get('sounds'));
                Cookies.set('sounds', false);
                for (var message in data) {
                    print_message(data[message]);
                }
                numMessages -= data.length;
                Cookies.set('sounds', sounds_setting);
            }
            if (type === 'chatMessage') {
                print_message(data);
            }
            if (type === 'privateMessage') {
                print_private_message(data);
            }
            twemoji.parse(document.body, {base: '/static/', folder:'emojione/assets/'});
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
    $('#user_list').empty();
    for (var user in newList) {
        $('#user_list').append($('<div/>').text(user));
    }
}

function setUsername() {
    var username_cookie = Cookies.get("username");
    if (username_cookie)
        $("#set_name").val(username_cookie);

    var color_cookie = Cookies.get("color");
    if (color_cookie) {
        colorpicker.setColor(color_cookie);
    }

    if (Cookies.get('sounds') === undefined) {
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
                    }
                }
            },
            minlength: 1,
            maxlength: 16
        },
        color: {
            required: true
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
        if ($("#set_name").val() !== '' && $("#set_name").val() !== username) {
            data.newUser = $('#set_name').val();
            Cookies.set("username", $("#set_name").val());
            showUsername();
        }
        var color = Cookies.get("color");
        if (colorpicker.val() !== color) {
            data.newColor = $("#color").val();
            Cookies.set("color", colorpicker.val());
        }

        if (data.newUser || data.newColor || $('#toggle-sound').is(':checked') !== JSON.parse(Cookies.get('sounds')) || $('input[name="sounds-radios"]:checked').val() !== Cookies.get('sound_set')) {
            if (data.newUser || data.newColor) {
                sock.send(JSON.stringify({
                    'type': 'userSettings',
                    'settings': data,
                    'user': username
                }));
            }
            if ($('#toggle-sound').is(':checked') !== JSON.parse(Cookies.get('sounds'))) {
                toggleSounds();
                if (JSON.parse(Cookies.get('sounds'))) {
                    print_message({
                        user: "Client",
                        message: "Sound enabled",
                        time: moment().unix()
                    });
                }
                else {
                    print_message({
                        user: "Client",
                        message: "Sound disabled",
                        time: moment().unix()
                    });
                }
            }
            if ($('input[name="sounds-radios"]:checked').val() !== Cookies.get('sound_set')) {
                chooseSoundSet();
                print_message({
                    user: "Client",
                    message: Cookies.get('sound_set') + " sounds chosen",
                    time: moment().unix()
                });
            }
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
    var date = $('<em/>').addClass('text-muted').text(moment.unix(msg.time).format("MM/DD/YY HH:mm:ss "));
    var salutation = '[message ' + (msg.sender === Cookies.get('username') ? 'to ' + msg.recipient : 'from ' + msg.sender) + '] ';
    var message = $('<span/>').append($('<em/>').append($('<strong/>').text(salutation)).append($('<span/>').html(msg.message))).addClass('private-message');
    $('#log').append($('<div/>').append(date).append(message).html() + '<br>');
    $('#log').scrollTop(document.getElementById('log').scrollHeight);
    if (msg.user === Cookies.get('username')) {
        play_send();
    }
    else {
        numMessages++;
        if (msg.user !== 'Client') play_receive();
        if (!window_focus) {
            window.document.title = "(" + numMessages + ") Best ever chat!";
            $("#favicon").attr("href", "/static/favicon2.png");
        }
    }
}

function print_message(msg) {
    var date = $('<em/>').addClass('text-muted').text(moment.unix(msg.time).format("MM/DD/YY HH:mm:ss "));
    var message = $('<span/>').append($('<strong/>').text('<' + msg.user + '> ')).append($('<span/>').html(msg.message));
    if (msg.color)
        message.css('color', msg.color);
    if (msg.user === 'Server') {
        message.addClass('server-message');
    }
    if (msg.user === 'Client') {
        message.addClass('client-message');
    }
    $('#log').append($('<div/>').append(date).append(message).html() + '<br>');
    $('#log').scrollTop(document.getElementById('log').scrollHeight);
    if (msg.user === 'Server') {
        if (msg.message.includes('disconnected')) play_disconnect();
        else if (msg.message.includes('connected') && !msg.message.includes(Cookies.get('username'))) {
            play_connect();
        }
    }
    else if (msg.user === Cookies.get('username')) {
        play_send();
    }
    else {
        numMessages++;
        if (msg.user !== 'Client') play_receive();
        if (!window_focus) {
            window.document.title = "(" + numMessages + ") Best ever chat!";
            $("#favicon").attr("href", "/static/favicon2.png");
        }
    }
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
