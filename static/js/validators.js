$(document).ready(function () {
    $('#settings_form').validate(validation_settings);
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

        var localChangesMade = false;
        var newTimestamps = $('input[name="timestamps"]:checked').val();
        if (newTimestamps !== localStorage.getItem('timestamps')) {
            localStorage.setItem('timestamps', newTimestamps);
            // empty and reload the chat log
            $('#log').empty();
            print_message_history(active_room);
            localChangesMade = true;
            print_message({
                user: "Client",
                message: "Timestamp settings updated.",
                time: moment().unix()
            });
        }
        var fontSize = $('#font-size').val();
        if (fontSize !== localStorage.getItem('fontSize')) {
            localStorage.setItem('fontSize', fontSize);
            $('body').css({fontSize: fontSize});
            localChangesMade = true;
            print_message({
                user: "Client",
                message: "Changed font size to {}.".replace('{}', fontSize),
                time: moment().unix()
            });
        }
        var hideImages = $('#hidden_images').is(':checked');
        if (hideImages !== JSON.parse(localStorage.getItem('hideImages'))) {
            localStorage.setItem('hideImages', hideImages);
            localChangesMade = true;
            print_message({
                user: "Client",
                message: "Received images are now {}.".replace('{}', hideImages ? 'hidden' : 'visible'),
                time: moment().unix()
            });
        }
        // TODO profamity filter settings
        var newTitle = $('#tab_title').val();
        if (!newTitle) {
            localStorage.removeItem('tab_title');
            localChangesMade = true;
            print_message({
                user: "Client",
                message: "Tab title set to '{}'. You are no longer being discreet.".replace('{}', newTitle),
                time: moment().unix()
            });
        }
        else if (newTitle !== localStorage.getItem('tab_title')) {
            localStorage.setItem('tab_title', newTitle);
            localChangesMade = true;
            print_message({
                user: "Client",
                message: "Tab title set to '{}'. No one will ever know that this is Best Evar Chat 2.0!".replace('{}', newTitle),
                time: moment().unix()
            });
        }
        window.document.title = getPageTitle();

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

        if (data.newUser || data.newFaction || data.newColor || data.newSoundSet || data.newSounds || data.newEmail || !localChangesMade) {
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