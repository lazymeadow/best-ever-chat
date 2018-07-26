import twemoji from "twemoji";

export const CLIENT_VERSION = '3.0';

export function _parseEmojis(element) {
    twemoji.parse(element || document.body, {
        base: '/static/',
        folder: 'emojione/assets/',
        attributes: function (icon, variant) {
            return {title: icon + variant};
        }
    });
}