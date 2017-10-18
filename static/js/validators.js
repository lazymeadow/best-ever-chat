$(document).ready(function () {
    $('#settings_form').validate(validation_settings);
    $('#create-room').validate(newRoomSettings);
});

var validation_settings = {
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
        var sounds = $('#volume-slider').val();
        if (sounds !== Cookies.get('sounds')) {
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

        var fontSize = $('#font-size').val();
        if (fontSize !== Cookies.get('fontSize')) {
            Cookies.set('fontSize', fontSize);
            $('body').css({fontSize: fontSize});
        }
        var hide_images = $('#hidden_images').is(':checked');
        if (hide_images !== Cookies.get('hideImages')) {
            Cookies.set('hideImages', hide_images);
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

        if (data.newUser || data.newFaction || data.newColor || data.newSoundSet || data.newSounds || data.newEmail) {
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

        toggleModal('settings');
    }
};

var newRoomSettings = {
    rules: {
        name: {
            required: true,
            minlength: 3
        }
    },
    submitHandler: function () {
        var data = {};
        data.name = $('#name').val();

        sock.send(JSON.stringify({
            'type': 'newRoom',
            'data': data,
            'user': Cookies.get('username')
        }));
        toggleModal('newRoom');
    }
};