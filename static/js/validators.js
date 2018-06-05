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
                        return localStorage.getItem('username');
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
        var username = localStorage.getItem("username");
        var data = {};
        var setName = $("#set_name");
        if (setName.val() !== '' && setName.val() !== username) {
            data.newUser = setName.val();
            data.oldUser = localStorage.getItem('username');
        }
        var color = localStorage.getItem("color");
        if (colorPicker.val() !== color) {
            data.newColor = $("#color").val();
        }
        var sounds = $('#volume-slider').val();
        if (sounds !== localStorage.getItem('sounds')) {
            data.newSounds = sounds;
        }
        var soundSet = $('input[name="sounds-radios"]:checked').val();
        if (soundSet !== localStorage.getItem('sound_set')) {
            data.newSoundSet = soundSet;
        }
        var faction = $('input[name="faction"]:checked').val();
        if (faction !== localStorage.getItem('faction')) {
            data.newFaction = faction;
        }

        var email = $('#email').val();
        if (email !== '' && email !== localStorage.getItem('email')) {
            data.newEmail = email;
        }

        var newProfamity = $('#profamity_filter').is(':checked');
        if (newProfamity !== JSON.parse(Cookies.get('profamity_filter') || 'false')) {
            Cookies.set('profamity_filter', newProfamity);
            data.newProfamity = newProfamity;
            sock.send(JSON.stringify({
                'type': 'historyRequest'
            }));
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
                message: "Received images will be {}.".replace('{}', hideImages ? 'hidden' : 'visible'),
                time: moment().unix()
            });
        }
        var newTitle = $('#tab_title').val();
        // if the box is empty and the page title is not default
        // if the box is default and the saved value isn't
        if ((!newTitle && getPageTitle() !== DEFAULT_TITLE) || (newTitle === DEFAULT_TITLE && localStorage.getItem('tab_title') !== DEFAULT_TITLE)) {
            localStorage.setItem('tab_title', DEFAULT_TITLE);
            localChangesMade = true;
            print_message({
                user: "Client",
                message: "Tab title set to '{}'. You are no longer being discreet.".replace('{}', getPageTitle()),
                time: moment().unix()
            });
        }
        // if the current value is not empty or default and the value doesn't match the title
        else if (newTitle && newTitle !== DEFAULT_TITLE && newTitle !== localStorage.getItem('tab_title')) {
            localStorage.setItem('tab_title', newTitle);
            localChangesMade = true;
            print_message({
                user: "Client",
                message: "Tab title set to '{}'. No one will ever know that this is Best Evar Chat 2.0!".replace('{}', getPageTitle()),
                time: moment().unix()
            });
        }
        $('#tab_title').val(getPageTitle());
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

        if (data.newUser || data.newFaction || data.newColor || data.newSoundSet || data.newSounds || data.newEmail
            || Object.keys(data).includes('newProfamity')) {
            if (!sock) connect();
            sock.send(JSON.stringify({
                'type': 'userSettings',
                'settings': data,
                'user': username
            }));
        }
        else if (!localChangesMade) {
            print_message({
                user: "Client",
                message: "No changes made",
                time: moment().unix()
            });
        }

        toggleModal('settings');
    }
};