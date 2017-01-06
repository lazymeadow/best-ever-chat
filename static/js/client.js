version = 42;

var socket;

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


var numMessages = 0;
var MAX_RETRIES = 3;
var colorpicker;

var window_focus = true;
var reloading = false;

window.onbeforeunload = function() {
    reloading = true;
    socket.emit('disconnect_request');
};

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

            if (data.newUser || data.newColor || $('#toggle-sound').is(':checked') !== JSON.parse(Cookies.get('sounds'))) {
                if (data.newUser || data.newColor) {
                    if (socket) socket.emit('update_user', {
                        data: data,
                        user: username
                    });
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

$(document).ready(function() {

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

});


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
    if (msg.user === 'Server') {
        if (msg.data.includes('disconnected')) play_disconnect();
        else if (msg.data.includes('connected') && !msg.data.includes(Cookies.get('username'))) {
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
