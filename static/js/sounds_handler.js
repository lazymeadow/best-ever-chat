// sounds
var receive_sound, send_sound, connect_sound, disconnect_sound, activate_sound;

// functions
$(document).ready(function () {
    if (Cookies.get("sounds") === undefined) {
        Cookies.set("sounds", false);
    }
    $('#toggle-sound').bootstrapToggle({
        size: 'small',
        on: "<i class='fa fa-volume-up'></i>",
        onstyle: 'success',
        off: "<i class='fa fa-volume-off'></i>",
        offstyle: 'danger'
    })
    .on('change', function (event) {
        $('input:radio[name=sounds-radios]').prop('disabled', !$(this).prop("checked"));
    });
    $('#toggle-sound').prop("checked", JSON.parse(Cookies.get('sounds'))).change();
    $('input:radio[name=sounds-radios]').prop('disabled', !$('#toggle-sound').prop("checked"));

    if (Cookies.get("sound_set") === undefined) {
        Cookies.set("sound_set", 'AIM');
    }
    $('input:radio[name=sounds-radios]').filter('[value={}]'.replace('{}', Cookies.get('sound_set'))).prop('checked', true);

    receive_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/message-receive.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
    $('body').append(receive_sound);
    send_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/message-send.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
    $('body').append(send_sound);
    connect_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/user-online.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
    $('body').append(connect_sound);
    disconnect_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/user-offline.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
    $('body').append(disconnect_sound);
    activate_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/activate-sounds.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
    $('body').append(activate_sound);
});

function chooseSoundSet() {
    Cookies.set('sound_set', $('input[name="sounds-radios"]:checked').val());
    update_audio_tags();

    play_activate();
}

function toggleSounds() {
    var sounds = JSON.parse(Cookies.get('sounds'));
    Cookies.set('sounds', !sounds);
    play_activate();
}

function update_audio_tags() {
    receive_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/message-receive.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
    send_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/message-send.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
    connect_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/user-online.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
    disconnect_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/user-offline.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
    activate_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/activate-sounds.wav'.replace('{}', Cookies.get("sound_set"))).attr('type', 'audio/mpeg');
}


function play_receive() {
    if (JSON.parse(Cookies.get('sounds')))
        receive_sound[0].play();
}

function play_send() {
    if (JSON.parse(Cookies.get('sounds')))
        send_sound[0].play();
}

function play_connect() {
    if (JSON.parse(Cookies.get('sounds')))
        connect_sound[0].play();
}

function play_disconnect() {
    if (JSON.parse(Cookies.get('sounds')))
        disconnect_sound[0].play();
}

function play_activate() {
    if (JSON.parse(Cookies.get('sounds')))
        activate_sound[0].play();
}