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

    $($('#current-user').children().last()).click(() => {
        overlay.show();
        $('.popout-menu').toggle();
    });

    $('#add-room').click((e) => {
        const modal = $('<div>').addClass('modal')
            .click((e) => {
                e.stopPropagation();
            })
            .append($('<input>').prop('id', 'new-room-name').prop('placeholder', 'Room name'))
            .append($('<button>').text('Create Room').click((e) => {
                client.createRoom($('#new-room-name').val());
                $('.modal').remove();
                overlay.hide();
            }));
        overlay.one('click', (e) => {
            modal.remove()
        }).append(modal).show();
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

    twemoji.parse(document.body, {
        base: '/static/',
        folder: 'emojione/assets/',
        attributes: function (icon, variant) {
            return {title: icon + variant};
        }
    });

    $('.my-username').text(Settings.username);

    window.client = new BestEvarChatClient();
});

