client_version = 43;

var sock;

var timeout = null;
var reconnect_count = 0;
var MAX_RETRIES = 3;
var window_focus = true;

$(document).ready(function () {
    // page stuff
    $(window).focus(function() {
        numMessages = 0;
        window.document.title = "Best ever chat!";
        window_focus = true;
        $('#chat_text').focus();
    }).blur(function() {
        window_focus = false;
    });

    colorpicker = $.farbtastic("#colorpicker",
        function(color) {
            $("#color").val(color);
            $("#color").css('color', color);
        }
    );
    $('#update-user').validate(updateSettings);

    showUsername();

    timeout = window.setTimeout(connect, 500);
});

function addEmoji(emoji) {
    console.log(emoji);
    $('#chat_text').val($('#chat_text').val() + emoji);
    $('#chat_text').focus();
}

function showImageInput() {
    $('#imageInput').modal('show');
}


function imageChat() {
    if ($('#img_url').val()) {
        $('#imageInput').modal('hide');
        sock.send(JSON.stringify({'type': 'imageMessage',
                    'user': Cookies.get('username'),
                    'url': $('#img_url').val()
                  }));
        $('#img_url').val('');
        $('#chat_text').focus();
    }
}

function submitChat(event) {
    if (event.keyCode === 13) {
        sock.send(JSON.stringify({'type': 'chatMessage',
                    'user': Cookies.get('username'),
                    'message': $('#chat_text').val()
                  }));
        $('#chat_text').val('');
        $('#chat_text').focus();
    }
}


function connect() {
    if (Cookies.get('username')) {

        // socket stuff
    //    sock = new SockJS('http://chat.applepeacock.com');
        sock = new SockJS('http://localhost:6969/chat');

        sock.onopen = function() {
            window.clearTimeout(timeout);
            timeout = null;
            reconnect_count = 0;
            sock.send(JSON.stringify({'type': 'version', 'client_version': client_version}));
        };

        sock.onmessage = function(e) {
            var type = e.data.type;
            var data = e.data.data;
            // handle all the damn message types
            if (type === 'userList') {
                updateUserList(data);
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
        };
        sock.onclose = function() {
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
        $('#connectError').modal('show');
        reconnect_count = 0;
    }
}

function reconnect() {
    $('#connectError').modal('hide');
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
    } else {
        colorpicker.setColor('#000000');
    }

    if (Cookies.get('sounds') === undefined) {
        $("#sounds_toggle").prop("checked", false);
    }
    else {
        $("#sounds_toggle").prop("checked", JSON.parse(Cookies.get('sounds')));
    }

    $('#userStats').modal('show');
}

function showUsername() {
    var username = Cookies.get("username");
    if (username)
        $("#username_display").text(username + ":");
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
                        username: function() {
                            return Cookies.get('username');
                        }
                    }
                },
                minlength: 1,
                maxlength: 32
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
        submitHandler: function() {
            var username = Cookies.get("username");
            data = {};
            if ($("#set_name").val() !== '' && $("#set_name").val() !== username) {
                data.newUser = $('#set_name').val();
                Cookies.set("username", $("#set_name").val());
                showUsername();
            }
            var color = Cookies.get("color");
            if ($('#color').val() !== color) {
                data.newColor = $("#color").val();
                Cookies.set("color", colorpicker.color);
            }

            if ($('input[name="sounds-radios"]:checked').val() !== Cookies.get('sound_set')) {
                chooseSoundSet();
            }

            if (data.newUser || data.newColor || $('#toggle-sound').is(':checked') !== JSON.parse(Cookies.get('sounds'))) {
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
                            data: "Sound enabled",
                            time: moment().unix()
                        });
                    }
                    else {
                        print_message({
                            user: "Client",
                            data: "Sound disabled",
                            time: moment().unix()
                        });
                    }
                }
            }
            else {
                print_message({
                    user: "Client",
                    data: "No changes made",
                    time: moment().unix()
                });
            }
            $('#userStats').modal('hide');
        }
    };


var numMessages = 0;

function print_message(msg) {
    let date = $('<em/>').addClass('text-muted').text(moment.unix(msg.time).format("MM/DD/YY HH:mm:ss "));
    let message = $('<span/>').append($('<strong/>').text('<' + msg.user + '> ')).append($('<span/>').html(msg.message));
    if (msg.color)
        message.css('color', msg.color);
    if (msg.user === 'Server') {
        message.addClass('text-warning');
    }
    if (msg.user === 'Client') {
        message.addClass('text-danger');
    }
    $('#log').append('<br>' + $('<div/>').append(date).append(message).html());
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
        }
    }
}
