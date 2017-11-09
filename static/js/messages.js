var numMessages = 0;
var autoScroll = true;

function parse_emojis(element) {
    twemoji.parse(element || document.body, {
        base: '/static/',
        folder: 'emojione/assets/',
        attributes: function (icon, variant) {
            return {title: icon + variant};
        }
    });
}

function getFormattedTimestamp(timestamp) {
    var timestamps = localStorage.getItem('timestamps') || 'date_time';
    if (timestamps === 'off') {
        return;
    }
    var format = 'HH:mm:ss';
    if (timestamps === 'date_time')
        format = "MM/DD/YY " + format;
    return moment.unix(timestamp).format(format);
}

function print_message(msg, ignoreCount) {
    if (msg.hasOwnProperty('image_url')) {
        var imageElement = $('<a>').prop('href', msg.image_url).prop('target', '_blank')
            .append($('<img>').prop('src', msg.image_src_url));
        var hideImage = JSON.parse(localStorage.getItem('hideImages') || 'true') || msg.nsfw_flag;
        hideImage ? imageElement.hide() : imageElement.show();
        msg.message = $('<div>').addClass('image-wrapper')
            .append($('<span>').text((hideImage ? 'show' : 'hide') + ' image' + (msg.nsfw_flag ? ' -- NSFW!' : '')).click(function (event) {
                var image_element = $(event.target).next();
                image_element.toggle();
                $(event.target).text((image_element.is(':visible') ? 'hide' : 'show') + ' image ' + (msg.nsfw_flag ? '-- NSFW!' : ''))
            }))
            .append(imageElement);
    }

    var chatLog = $('#log');
    var messageContainer = $('<div>').addClass('chat-message');
    var formatTimestamp = getFormattedTimestamp(msg.time);
    if (formatTimestamp)
        var date = $('<div>').addClass('time text-muted').text('[{}]'.replace('{}', formatTimestamp));
    var message = $('<div>').addClass('message').append($('<strong />').text(msg.user + ': ')).append($('<span />').html(msg.message));
    if (msg.color)
        message.css('color', msg.color);
    if (msg.user === 'Server') {
        message.addClass('server-message');
    }
    if (msg.user === 'Client') {
        message.addClass('client-message');
    }
    chatLog.append(messageContainer.append(date).append(message));
    messageContainer.imagesLoaded(function () {
        if (autoScroll) {
            chatLog.scrollTop(chatLog[0].scrollHeight);
        }
    });
    if (msg.user === 'Server') {
        if (msg.message.includes('disconnected')) play_disconnect();
        else if (msg.message.includes('connected') && !msg.message.includes(Cookies.get('username'))) {
            play_connect();
        }
    }
    else if (msg.user === Cookies.get('username')) {
        play_send();
    }
    else if (!ignoreCount) {
        if (msg.user !== 'Client') play_receive();
    }
    parse_emojis(messageContainer[0]);
}

function print_private_message(msg) {
    var chatLog = $('#log');
    var messageContainer = $('<div>').addClass('chat-message');
    var formatTimestamp = getFormattedTimestamp(msg.time);
    if (formatTimestamp)
        var date = $('<div>').addClass('time text-muted').text('[{}]'.replace('{}', formatTimestamp));
    var salutation = 'message ' + (msg.sender === Cookies.get('username') ? 'to ' + msg.recipient : 'from ' + msg.sender) + ': ';
    var message = $('<div>').addClass('message private-message')
        .append($('<strong />').text(salutation))
        .append($('<span />').html(msg.message));

    chatLog.append(messageContainer.append(date).append(message));
    messageContainer.imagesLoaded(function () {
        if (autoScroll) {
            chatLog.scrollTop(document.getElementById('log').scrollHeight);
        }
    });
    if (msg.user === Cookies.get('username')) {
        play_send();
    }
    else {
        if (msg.user !== 'Client') play_receive();
    }
    parse_emojis(messageContainer[0]);
}

function print_message_history(room) {
    var history = rooms[room].history;
    $('audio').prop('muted', true);
    for (var message in history) {
        if (history.hasOwnProperty(message)) {
            if (history[message].type === 'privateMessage') {
                print_private_message(history[message]);
            }
            else {
                print_message(history[message], true);
            }
        }
    }
    $('audio').prop('muted', JSON.parse(localStorage.getItem('muted') || 'false'));
}

function updateMessageCount() {
    if (!window_focus) {
        numMessages++;
        window.document.title = "(" + numMessages + ") " + getPageTitle();
        $("#favicon").attr("href", "/static/favicon2.png");
    }
}
