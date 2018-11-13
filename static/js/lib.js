import twemoji from "twemoji";
import moment from 'moment';
import {Settings} from "./util";

export const CLIENT_VERSION = '3.0';
export const MAX_RETRIES = 3;

export function _parseEmojis(element) {
    twemoji.parse(element || document.body, {
        base: '/static/',
        folder: 'emojione/assets',
        attributes: function (icon, variant) {
            return {title: icon + variant};
        }
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
