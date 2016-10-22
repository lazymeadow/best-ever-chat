var socket;

function updateUsername() {
    var username = Cookies.get("username");
    data = {};
    if ($("#set_name").val() !== '' && $("#set_name").val() !== username) {
        data.newUser = $('#set_name').val();
        Cookies.set("username", $("#set_name").val());
        showUsername();
    }
    var color = Cookies.get("color");
    if ($("#color").val() !== '#123456' && $('#color').val() !== color) {
        data.newColor = $("#color").val();
        Cookies.set("color", $("#color").val());
    }

    if (data.newUser || data.newColor) {
        if (socket) {
            socket.emit('update_user', {
                data: data,
                user: username || Cookies.get("username")
            });
        }
        $('#userStats').modal('hide');

        $('#saveUserData').attr('disabled', true);
    }
}

function setUsername() {
    var username = Cookies.get("username");
    if (username)
        $("#set_name").val(Cookies.get("username"));
    var color = Cookies.get("color");
    if (color) {
        colorpicker.setColor(color);
    }
    $('#userStats').modal('show');
}

function showUsername() {
    var username = Cookies.get("username");
    if (username)
        $("#username").text(username + ":");
    else
        setUsername();
}

var numMessages = 0;
var MAX_RETRIES = 3;
var colorpicker;

function connect() {
    if (!Cookies.get('username'))
        window.setTimeout(connect, 500);
    else {
        socket = io.connect('http://' + document.domain + ':' + location.port + namespace,
            {
                reconnectionDelay: 1500,
                reconnectionDelayMax: 4500,
                reconnectionAttempts: MAX_RETRIES
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

        function print_message(msg) {

            let date = $('<em/>').addClass('text-muted').text(moment.unix(msg.time).format("MM/DD/YY HH:mm:ss "));
            let message = $('<span/>').text('<' + msg.user + '> ' + msg.data);
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
            $.titleAlert('New message!', {
                requireBlur: true,
                stopOnFocus: true,
                interval: 500,
                duration: 3000
            });
        }

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
                print_message({user: 'Client', time: moment.now(), data: 'Connection lost!!'});
            }
        });

        socket.on('reconnect_attempt', function(number) {
            print_message({user: 'Client', time: moment.now(), data: 'Attempting to reconnect to the server... (' + number + '/' + MAX_RETRIES + ')'});
        });

        socket.on('reconnect_failed', function() {
            print_message({user: 'Client', time: moment.now(), data: 'Reconnect failed.'});
            $('#connectError').modal('show');
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
    $(window).focus(function() {
        numMessages = 0;
        window.document.title = "Best ever chat!";
        window_focus = true;
    }).blur(function() {
        window_focus = false;
    });

    colorpicker = $.farbtastic("#colorpicker", function(color) {
        $("#color").val(color);
        if (Cookies.get("color") !== color)
            enableSave();
    });


    namespace = '/chat';

    showUsername();

    window.setTimeout(connect, 500);

    $('form#chat').submit(function(event) {
        socket.emit('broadcast_message', {
            data: $('#chat_text').val(),
            user: Cookies.get('username')
        });
        $('#chat_text').val('');
        return false;
    });
});

function enableSave() {
    console.log(event);
    $('#saveUserData').attr('disabled', false);
}
