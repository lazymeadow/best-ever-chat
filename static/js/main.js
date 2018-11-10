/**
 * BEST EVAR CHAT CLIENT 3.0.0
 * @author Audrey Mavra McCormick
 */

import $ from 'jquery';
import {Modal} from "./components";
import {BestEvarChatClient} from "./client";
import {_parseEmojis} from "./lib";

let chatClient;
let idleTimeout;

$(function () {
    const overlay = $('.overlay');
    overlay.hide();

    // dismiss popout menus when clicking away from them
    $('body').click(() => {
        $('.popout-option').hide();
    });

    // overlay dismisses on click
    overlay.click(() => {
        overlay.hide();
        $('.popout-menu').hide();
    });

    // open main menu on click
    $('#main_menu').click(event => {
        event.stopPropagation();
        overlay.show();
        $('.popout-menu').toggle();
    });

    // open modal when clicking room +
    $('#add-room').click(() => {
        new Modal({
            content: $('<input>').prop('id', 'new-room-name').prop('placeholder', 'Room name'),
            buttonText: 'Create Room',
            buttonClickHandler: () => {
                const roomName = $('#new-room-name').val();
                if (roomName) {
                    chatClient.createRoom(roomName);
                }
            }
        });
    });

    const chatBar = $('.chat-bar');

    // add popout handlers on click for image chat and emoji list
    chatBar.children('.button').each((index, element) => {
        const popoutOption = $(element).children('.popout-option');

        // prevent clicking the child from toggling itself
        popoutOption.click(event => event.stopPropagation());

        $(element).click(event => {
            event.stopPropagation();
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

    chatBar.children('input').focus(() => {
        // hide all open popouts
        $('.popout-option').hide();
    })
        .keyup(event => {
            let chatInput = $(event.target);
            // submit chat on enter and reset value
            if (event.which === 13) {
                chatClient.sendChat(chatInput.val());
                chatInput.val('');
                chatInput.focus();
            }
            // update typing status
            const currentMessage = chatInput.val();
            chatClient.sendTyping(currentMessage.length > 0);
        });

    // image chat button handlers
    const image_chat = () => {
        const imageUrlElement = $('#image_url');
        chatClient.sendImage(imageUrlElement.val(), $('#image_nsfw').is(':checked'));
        $('.popout-option').hide();
        imageUrlElement.val('');
    };

    $('#image_chat_button').click(image_chat);

    // submit images on enter
    $('#image_url').keyup(event => {
        if (event.which === 13) {
            image_chat();
        }
    });

    // parse emoji list and button
    _parseEmojis();

    // adding emojis to your chat message when clicked in the list
    $('#emoji_list .emoji').click(event => {
        event.stopPropagation();
        const chatText = chatBar.children('input');
        chatText.val(chatText.val() + $(event.target).prop('alt'));
    });

    // set auto scroll threshold when messages are received so you're not popped back to the bottom when catching up
    window.autoScroll = true;
    $('#log').scroll(event => {
        const log = $(event.target);
        const scrollThreshold = 100;  // approximately five lines
        autoScroll = Math.abs(log.outerHeight(true) + log.scrollTop() - log[0].scrollHeight) < scrollThreshold;
    });

    // set idle listeners
    const resetIdleTimeout = () => {
        window.clearTimeout(idleTimeout);
        chatClient.sendIdle(false);
        idleTimeout = window.setTimeout(() => {
            chatClient.sendIdle(true);
        }, 15 * 60 * 1000);  // fifteen minutes
    };

    $(document).mouseenter(resetIdleTimeout)
        .scroll(resetIdleTimeout)
        .keydown(resetIdleTimeout)
        .click(resetIdleTimeout)
        .dblclick(resetIdleTimeout);

    chatClient = new BestEvarChatClient();
});
