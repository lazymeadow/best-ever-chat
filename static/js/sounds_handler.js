// sounds
var receive_sound, send_sound, connect_sound, disconnect_sound, activate_sound;


function setMute(value) {
    var btn = $('#volume-button');
    var audio_elements = $('audio');
    if (value) {
        audio_elements.prop('muted', true);
        Cookies.set('muted', true);
        btn.find('span').html('<i class="fa fa-volume-off fa-stack-2x"></i><i class="fa fa-ban fa-stack-2x text-danger"></i>');
    }
    else {
        audio_elements.prop('muted', false);
        Cookies.set('muted', false);
        var volume_slider = $('#volume-slider');
        if (volume_slider.val() > 33)
            btn.find('span').html('<i class="fa fa-volume-up fa-stack-2x"></i>');
        else
            btn.find('span').html('<i class="fa fa-volume-down fa-stack-2x"></i>');
    }
}

function setSoundVolume(value) {
    $('audio').prop('volume', value / 100);

    var btn = $('#volume-button');
    if (!JSON.parse(Cookies.get('muted') || 'false')) {
        if (value > 33)
            btn.find('span').html('<i class="fa fa-volume-up fa-stack-2x"></i>');
        else
            btn.find('span').html('<i class="fa fa-volume-down fa-stack-2x"></i>');
    }
}

// functions
$(document).ready(function () {
    var volumeSlider = $('#volume-slider');
    volumeSlider.change(function (event) {
        setSoundVolume(event.target.value);
        play_activate();
    });

    $('#volume-button').click(function () {
        setMute(!JSON.parse(Cookies.get('muted')));
        play_activate();
    });

    volumeSlider.val(Cookies.get('sounds'));

    if (Cookies.get("sound_set") === undefined) {
        Cookies.set("sound_set", 'AIM');
    }
    $('input:radio[name=sounds-radios]').filter('[value={}]'.replace('{}', Cookies.get('sound_set'))).prop('checked', true);

    receive_sound = $('<audio>').attr('type', 'audio/mpeg');
    $('body').append(receive_sound);
    send_sound = $('<audio>').attr('type', 'audio/mpeg');
    $('body').append(send_sound);
    connect_sound = $('<audio>').attr('type', 'audio/mpeg');
    $('body').append(connect_sound);
    disconnect_sound = $('<audio>').attr('type', 'audio/mpeg');
    $('body').append(disconnect_sound);
    activate_sound = $('<audio>').attr('type', 'audio/mpeg');
    $('body').append(activate_sound);

    setSoundVolume(volumeSlider.val());
    setMute(JSON.parse(Cookies.get('muted') || 'false'));
    update_audio_tags();
});

function chooseSoundSet() {
    $('input:radio[name=sounds-radios]').filter('[value={}]'.replace('{}', Cookies.get('sound_set'))).prop('checked', true);
    update_audio_tags();
    play_activate();
}

function update_audio_tags() {
    receive_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/message-receive.wav'.replace('{}', Cookies.get("sound_set")));
    send_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/message-send.wav'.replace('{}', Cookies.get("sound_set")));
    connect_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/user-online.wav'.replace('{}', Cookies.get("sound_set")));
    disconnect_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/user-offline.wav'.replace('{}', Cookies.get("sound_set")));
    activate_sound.attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/{}/activate-sounds.wav'.replace('{}', Cookies.get("sound_set")));
}

function play_receive() {
    if (!receive_sound.prop('muted'))
        receive_sound[0].play();
}

function play_send() {
    if (!send_sound.prop('muted'))
        send_sound[0].play();
}

function play_connect() {
    if (!connect_sound.prop('muted'))
        connect_sound[0].play();
}

function play_disconnect() {
    if (!disconnect_sound.prop('muted'))
        disconnect_sound[0].play();
}

function play_activate() {
    if (!activate_sound.prop('muted'))
        activate_sound[0].play();
}
