const CLIENT_VERSION = '3.0';

$(function () {
    const overlay = $('.overlay');

    overlay.hide();
    $('.popout-menu').hide();
    $('.inline-menu').hide();
    $('.popout-option').hide();

    overlay.click(() => {
        overlay.hide();
        $('.popout-menu').hide();
    });

    $($('#main_menu')).click(() => {
        overlay.show();
        $('.popout-menu').toggle();
    });

    $('#add-room').click(() => {
        new Modal({
            content: $('<input>').prop('id', 'new-room-name').prop('placeholder', 'Room name'),
            buttonText: 'Create Room',
            buttonClickHandler: () => client.createRoom($('#new-room-name').val())
        });
    });

    const chatBar = $('.chat-bar');

    chatBar.children('.button').each((index, element) => {
        const popoutOption = $(element).children('.popout-option');

        // prevent clicking the child from toggling itself
        popoutOption.click(event => event.stopPropagation());

        $(element).click(() => {
            if (popoutOption.is(':visible')) {
                popoutOption.hide();
            } else {
                // hide all popouts
                $('.popout-option').hide();
                // toggle the child
                popoutOption.show();
            }
        });
    });

    chatBar.children('input').focus(event => {
        // hide all open popouts
        $('.popout-option').hide();
    })
        .keyup(event => {
            if (event.which === 13) {
                let chatInput = $(event.target);
                client.sendChat(chatInput.val());
                chatInput.val('');
                chatInput.focus();
            }
        });

    const image_chat = event => {
        client.sendImage($('#image_url').val(), $('#image_nsfw').is(':checked'));
        $('.popout-option').hide();
        $('#image_url').val('');
    };

    $('#image_chat_button').click(image_chat);

    $('#image_url').keyup(event => {
        if (event.which === 13) {
            image_chat();
        }
    });

    _parseEmojis();

    $('#emoji_list .emoji').click(event => {
        var chatText = chatBar.children('input');
        chatText.val(chatText.val() + $(event.target).prop('alt'));
        $('.popout-option').hide();
    });

    $('.my-username').text(Settings.username);

    window.autoScroll = true;
    $('#log').scroll(event => {
        const log = $(event.target);
        const scrollThreshold = 100;  // approximately five lines
        autoScroll = Math.abs(log.outerHeight(true) + log.scrollTop() - log[0].scrollHeight) < scrollThreshold;
    });

    window.client = new BestEvarChatClient();
    new MainMenu(client);
});

function _parseEmojis(element) {
    twemoji.parse(element || document.body, {
        base: '/static/',
        folder: 'emojione/assets/',
        attributes: function (icon, variant) {
            return {title: icon + variant};
        }
    });
}

