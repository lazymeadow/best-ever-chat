// sounds
var receive_sound, send_sound, connect_sound, disconnect_sound, moo_sound;

// functions
$(document).ready(function () {
    receive_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/imrcv.wav').attr('type', 'audio/mpeg');
    $('body').append(receive_sound);
    send_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/imsend.wav').attr('type', 'audio/mpeg');
    $('body').append(send_sound);
    connect_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/buddyin.wav').attr('type', 'audio/mpeg');
    $('body').append(connect_sound);
    disconnect_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/buddyout.wav').attr('type', 'audio/mpeg');
    $('body').append(disconnect_sound);
    moo_sound = $('<audio>').attr('src', 'https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/moo.wav').attr('type', 'audio/mpeg');
    $('body').append(moo_sound);

    $('#toggle-sound').bootstrapToggle({
        size: 'small',
        on: "<i class='fa fa-volume-up'></i>",
        onstyle: 'success',
        off: "<i class='fa fa-volume-off'></i>",
        offstyle: 'danger'
    });

    if (Cookies.get("sounds") === undefined) {
        Cookies.set("sounds", false);
    }
    $('#toggle-sound').prop("checked", JSON.parse(Cookies.get('sounds')));
});

function toggleSounds() {
    var sounds = JSON.parse(Cookies.get('sounds'));
    Cookies.set('sounds', !sounds);
    play_moo();
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

function play_moo() {
    if (JSON.parse(Cookies.get('sounds')))
        moo_sound[0].play();
}