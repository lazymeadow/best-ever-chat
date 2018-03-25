class MessageLog extends LoggingClass {
    constructor() {
        super();
        this._logElement = $('#log');
    }

    /**
     * Print a chat message to the log.
     * <div class="chat-message">
     *     <div class="timestamp">[MM/DD/YYYY HH:MM]</div>
     *     <div class="message">
     *         <span class="username">username</span>
     *         <span>message body</span>
     *     </div>
     * </div>
     *
     * @param time message time
     * @param username sender
     * @param color message color
     * @param message message body
     * @param image_url image url
     * @param image_src_url image src url
     * @param nsfw_flag image is nsfw
     */
    printMessage({time, username, color, message, image_url, image_src_url, nsfw_flag}) {
        let messageContainer = $('<div>').addClass('chat-message');
        // set the message color
        if (color)
            messageContainer.css('color', color);
        if (username === 'Server') {
            messageContainer.addClass('server-message');
        }
        if (username === 'Client') {
            messageContainer.addClass('client-message');
        }

        // add the timestamp
        messageContainer.append($('<span>').addClass('timestamp').text(this._formatTime(time)));

        // if the message is an image, create the <img> as the  message body
        if (image_url) {
            let imageElement = $('<a>').prop('href', image_url).prop('target', '_blank')
                .append($('<img>').prop('src', image_src_url));
            let hideImage = JSON.parse(localStorage.getItem('hideImages') || 'true') || nsfw_flag;
            hideImage ? imageElement.hide() : imageElement.show();
            message = $('<div>').addClass('image-wrapper')
                .append($('<span>').text((hideImage ? 'show' : 'hide') + ' image' + (nsfw_flag ? ' -- NSFW!' : ''))
                    .click(function (event) {
                    let image_element = $(event.target).next();
                    image_element.toggle();
                    $(event.target).text((image_element.is(':visible') ? 'hide' : 'show') + ' image ' + (nsfw_flag ? '-- NSFW!' : ''))
                }))
                .append(imageElement);
        }

        // add the message body
        let messageElement = $('<div>').addClass('message')
            .append($('<span>').addClass('username').text(username + ': '))
            .append($('<span>').html(message));

        this._logElement.append(messageContainer.append(messageElement));

        messageContainer.imagesLoaded(() => {
            if (autoScroll) {
                this._logElement.scrollTop(this._logElement[0].scrollHeight);
            }
        });

        // TODO move this into the room handler
        // if (username === 'Server') {
        //     if (includes('disconnected')) play_disconnect();
        //     else if (includes('connected') && !includes(Cookies.get('username'))) {
        //         SoundManager.playConnected();
        //     }
        // }
        // else if (username === Cookies.get('username')) {
        //     SoundManager.playSent();
        // }
        // else if (!ignoreCount) {
        //     if (username !== 'Client') SoundManager.playReceived();
        // }

        this._parseEmojis(messageContainer[0]);
        super.debug('Added message to log.');
    }

    /**
     * Prints an array of messages to the log.
     *
     * @param messages an array of messages to print
     */
    printMessages(messages) {
        super.debug('Printing message log...');
        this._logElement.empty();
        messages.forEach((item) => this.printMessage(item));
        super.debug('Message log printed.');
    }

    /**
     * Formats a given timestamp according the the client settings.
     * @param timestamp
     * @returns string the formatted timestamp
     * @private
     */
    _formatTime(timestamp) {
        if (Settings.timestamps === 'off') {
            return '';
        }
        let format = 'HH:mm:ss';
        if (Settings.timestamps === 'date_time')
            format = "MM/DD/YY " + format;
        return `[${moment.unix(timestamp).format(format)}]`;
    }

    _parseEmojis(element) {
        twemoji.parse(element || document.body, {
            base: '/static/',
            folder: 'emojione/assets/',
            attributes: function (icon, variant) {
                return {title: icon + variant};
            }
        });
    }
}