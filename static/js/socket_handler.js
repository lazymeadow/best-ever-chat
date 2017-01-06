var socket;

$(document).ready(function () {
    namespace = '/chat';
    window.setTimeout(connect, 500);
});


function submitChat(event) {
    if (event.keyCode === 13) {
        socket.emit('broadcast_message', {
            data: $('#chat_text').val(),
            user: Cookies.get('username')
        });
        $('#chat_text').val('');
        $('#chat_text').focus();
    }
}

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
            console.log('session error');
        });

        socket.on('history_response', function(data) {
            sounds_setting = JSON.parse(Cookies.get('sounds'));
            Cookies.set('sounds', false);
            for (var message in data.history) {
                print_message(data.history[message]);
            }
            numMessages -= data.history.length;
            Cookies.set('sounds', sounds_setting);
            socket.emit('connect_message', {
                user: Cookies.get("username"),
                color: Cookies.get('color') || '#000000',
                version: version
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
