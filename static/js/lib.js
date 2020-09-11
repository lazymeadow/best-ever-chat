import $ from 'jquery';
import twemoji from "twemoji";
import moment from 'moment';
import {ChatHistory, Settings} from "./util";

export const CLIENT_VERSION = '4.1.1';
export const MAX_RETRIES = 3;

let idleTimeout;
let chatHistory;
let emojiSearchTimeout;

export function _parseEmojis(element) {
    twemoji.parse(element || document.body, {
        callback: (icon, options) => options.base.concat(icon, options.ext),
        base: 'https://emoji.bestevarchat.com/',
        attributes: function (icon, variant) {
            return {title: icon + variant};
        }
    });
}

function _emojiLibraryClickSetup() {
    // adding emojis to your chat message when clicked in the list
    $('#emoji_list .emoji').click(event => {
        event.stopPropagation();
        const chatText = $('.chat-bar').children('input');
        chatText.val(chatText.val() + $(event.target).prop('alt'));
    });
}

/**
 * Formats a given timestamp according the the client settings.
 * @param timestamp
 * @returns string the formatted timestamp
 * @private
 */
export function _formatTime(timestamp) {
    if (Settings.timestamps === 'off') {
        return '';
    }
    let format = 'HH:mm:ss';
    if (Settings.timestamps === 'date_time')
        format = "MM/DD/YY " + format;
    return `[${moment.unix(timestamp).format(format)}]`;
}

export function _focusChatBar() {
    $('.chat-bar').children('input').focus();
}

/**
 * Common dom initialization for desktop and mobile clients before client creation
 */
export function preClientInit() {
    const overlay = $('.overlay');
    overlay.hide();

    // dismiss popout menus when clicking away from them
    $('body').click(() => {
        $('.popout-option').hide();
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
    chatBar.children('input')
        .focus(() => {
            // hide all open popouts
            $('.popout-option').hide();
        });

    // parse emoji list and button
    _parseEmojis();
    _emojiLibraryClickSetup();

    // set auto scroll threshold when messages are received so you're not popped back to the bottom when catching up
    window.autoScroll = true;
    $('#log').scroll(event => {
        const log = $(event.target);
        const scrollThreshold = 100;  // approximately five lines
        autoScroll = Math.abs(log.outerHeight(true) + log.scrollTop() - log[0].scrollHeight) < scrollThreshold;
    });
}

/**
 * Common dom initialization for desktop and mobile clients after client creation
 */
export function postClientInit(chatClient) {
    chatHistory = new ChatHistory();

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

    let imageData;
    // listen for an image file upload
    $('#image_upload').on('change', function () {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            imageData = fileReader.result;
        };
        fileReader.readAsDataURL($('#image_upload').prop('files')[0]);
    });

    // image upload button handlers
    const image_upload = () => {
        const imageUploadElement = $('#image_upload');
        chatClient.sendImageUpload(imageData, imageUploadElement.prop('files')[0].type, $('#image_upload_nsfw').is(':checked'));
        $('.popout-option').hide();
        imageUploadElement.val('');
    };

    $('#image_upload_button').click(image_upload);


    $('.chat-bar').children('input')
        .keyup(event => {
            let chatInput = $(event.target);
            const currentMessage = chatInput.val();

            // up arrow goes through history
            if (event.which === 38) {
                chatInput.val(chatHistory.getNext());
                if (currentMessage !== '') {
                    chatHistory.addMessage(currentMessage, true);
                }
            }
            // down arrow goes through history, too
            else if (event.which === 40) {
                chatInput.val(chatHistory.getPrevious());
            } else {
                chatHistory.reset();
            }
            // submit chat on enter and reset value
            if (event.which === 13) {
                if (currentMessage !== '') {
                    chatHistory.addMessage(currentMessage);
                    chatClient.sendChat(currentMessage);
                }
                chatInput.val('');
                chatInput.focus();
            }

            // update typing status
            chatClient.sendTyping();
        });

    const _buildEmojiTable = (unicodeChars) => {
        const resultsContainer = $('#emoji_list');
        resultsContainer.empty();
        let row = $('<tr>');
        let completeRow = false;
        for (let index = 0; index < 108; index++) {
            if (index === 0 && unicodeChars.length === 0) {
                row.append($('<td>', {text: 'Only official emojis, you fool.'}));
            }
            else {
                const item = unicodeChars[index];
                if (!item) {
                    row.append($('<td>'));
                } else {
                    // twemoji + joypixels = bad encoding
                    // convert from unicode to twemoji shortcode, then back, and the images are just great
                    row.append($('<td>', {html: twemoji.convert.fromCodePoint(twemoji.convert.toCodePoint(item))}));
                }
                completeRow = (index + 1) % 12 === 0;
                if (completeRow) {
                    resultsContainer.append(row);
                    row = $('<tr>');
                }
            }
        }
        if (!completeRow) {
            resultsContainer.append(row);
        }
        _parseEmojis(resultsContainer[0]);
        _emojiLibraryClickSetup();
    }

    const _emojiSearchCallback = (query) => {
        if (!emojiSearchTimeout) {
            window.clearTimeout(emojiSearchTimeout);
            emojiSearchTimeout = window.setTimeout(() => {
                $.get('/emoji_search', {
                    search: query
                })
                    .then(rsp => {
                        const {result} = JSON.parse(rsp);
                        _buildEmojiTable(result);
                    });
                emojiSearchTimeout = null;
            }, 500);  // half a second
        }
    }

    $('#emoji_search').keyup(event => {
        let searchInput = $(event.target);
        const searchQuery = searchInput.val();
        _emojiSearchCallback(searchQuery);
    });

    $('#clear_emoji_search').click(() => {
        $('#emoji_search').val('');
        _emojiSearchCallback('');
    })

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

    $(window).blur(() => {
        chatClient.enableNotifications();
    });

    $(window).focus(() => {
        chatClient.resetUnreadMessageCount();

        chatClient.disableNotifications();

        _focusChatBar();
    });
}