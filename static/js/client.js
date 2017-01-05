var socket;
var sounds = false;
var recv_sound, send_sound, connect_sound, disconnect_sound, moo_sound;

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
        socket.emit('broadcast_image', $('#img_url').val());
    }
}

function setUsername() {
    var username = Cookies.get("username");
    if (username)
        $("#set_name").val(Cookies.get("username"));
    var color = Cookies.get("color");
    if (color) {
        colorpicker.setColor(color);
    } else {
        colorpicker.setColor('#000000');
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

function toggleSounds() {
    sounds = !sounds;
    Cookies.set('sounds', sounds);
}

var numMessages = 0;
var MAX_RETRIES = 3;
var colorpicker;

function connect() {
    if (!Cookies.get('username'))
        window.setTimeout(connect, 500);
    else {
        socket = io.connect('http://' + document.domain + ':' + location.port + namespace, {
            reconnectionDelay: 1500,
            reconnectionDelayMax: 4500,
            reconnectionAttempts: MAX_RETRIES
        });

        socket.on('session_error', function() {
            socket.close();
            socket.open();
        });

        socket.on('history_response', function(data) {
            for (var message in data.history) {
                print_message(data.history[message]);
            }
            socket.emit('connect_message', {
                user: Cookies.get("username"),
                color: Cookies.get('color') || '#000000'
            });
        });

        socket.on('chat_response', print_message);

        socket.on('user_list', function(msg) {
            $('#user_list').empty();
            for (var user in msg['data']) {
                $('#user_list').append($('<div/>').text(msg['data'][user]));
            }
        });

        socket.on('update_response', function(msg) {
            print_message(msg);
            if (msg.revertName) {
                Cookies.set("username", msg.revertName);
                showUsername();
            }
        });

        socket.on('disconnect', function() {
            if (!reloading) {
                print_message({
                    user: 'Client',
                    time: moment().unix(),
                    data: 'Connection lost!!'
                });
            }
        });

        socket.on('reconnect_attempt', function(number) {
            print_message({
                user: 'Client',
                time: moment().unix(),
                data: 'Attempting to reconnect to the server... (' + number + '/' + MAX_RETRIES + ')'
            });
        });

        socket.on('reconnect_failed', function() {
            print_message({
                user: 'Client',
                time: moment().unix(),
                data: 'Reconnect failed.'
            });
            $('#connectError').modal('show');
        });

        socket.on('connect_error', function(error) {
            print_message({
                user: 'Client',
                time: moment().unix(),
                data: 'Connection error'});
            console.log(error);
        });

        socket.on('reconnect_error', function(error) {
            print_message({
                user: 'Client',
                time: moment().unix(),
                data: 'Reonnection error'});
            console.log(error);
        });
    }
}

function attemptReconnect() {
    socket.open();
    $('#connectError').modal('hide');
}

var window_focus = true;
var reloading = false;

window.onbeforeunload = function() {
    reloading = true;
    socket.emit('disconnect_request');
};

$(document).ready(function() {
    recv_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/imrcv.wav').attr('type', 'audio/mpeg');
    $('body').append(recv_sound);
    send_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/imsend.wav').attr('type', 'audio/mpeg');
    $('body').append(send_sound);
    connect_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/buddyin.wav').attr('type', 'audio/mpeg');
    $('body').append(connect_sound);
    disconnect_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/buddyout.wav').attr('type', 'audio/mpeg');
    $('body').append(disconnect_sound);
    moo_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/moo.wav').attr('type', 'audio/mpeg');
    $('body').append(moo_sound);

    console.log(sounds);
    console.log(Cookies.get('sounds'));
    sounds = Cookies.get('sounds');
    console.log(sounds);
    $('#toggle-sound').prop("checked", sounds);
    $('#toggle-sound').bootstrapToggle({
        size: 'small',
        on: "<i class='fa fa-volume-up'></i>",
        onstyle: 'success',
        off: "<i class='fa fa-volume-off'></i>",
        offstyle: 'danger'
    });

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

    namespace = '/chat';

    showUsername();

    window.setTimeout(connect, 500);



    $('form#update-user').validate({
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

            if (data.newUser || data.newColor) {
                socket.emit('update_user', {
                    data: data,
                    user: username
                });
            }
            else if ($('#toggle-sound').val() !== sounds) {
                toggleSounds();
                if (sounds) {
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
            else {
                print_message({
                    user: "Client",
                    data: "No changes made",
                    time: moment().unix()
                });
            }
            $('#userStats').modal('hide');
        }
    });

});

function submitChat(event) {
    if (event.keyCode === 13) {
        socket.emit('broadcast_message', {
            data: $('#chat_text').val(),
            user: Cookies.get('username')
        });
        $('#chat_text').val('');
        $('#chat_text').focus();
        if (sounds) send_sound[0].play();
    }
}

function print_message(msg) {
    let date = $('<em/>').addClass('text-muted').text(moment.unix(msg.time).format("MM/DD/YY HH:mm:ss "));
    let message = $('<span/>').append($('<strong/>').text('<' + msg.user + '> ')).append($('<span/>').html(msg.data));
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
    if (!window_focus) {
        numMessages++;
        window.document.title = "(" + numMessages + ") Best ever chat!";
    }
    if (msg.user === 'Server') {
        if (sounds && msg.data.includes('disconnected')) disconnect_sound[0].play();
        else if (sounds && msg.data.includes('connected') && !msg.data.includes(Cookies.get('username'))) {
            connect_sound[0].play();
        }
    }
    else {
        if (sounds && msg.user !== Cookies.get('username') && msg.user !== 'Client') recv_sound[0].play();
    }
    $.titleAlert('New message!', {
        requireBlur: true,
        stopOnFocus: true,
        interval: 500,
        duration: 3000
    });
}
