import $ from 'jquery';
import {LoggingClass} from "./Logger";

export default class NotificationManager extends LoggingClass {
    constructor() {
        super('NotificationManager');
        this._enabled = false;
        this._timeout = null;
        this._dontBother = false;
    }

    enableNotifications() {
        console.log('Notifications enabled');
        this._enabled = true;
    }

    disableNotifications() {
        console.log('Notifications disabled');
        this._enabled = false;
    }

    _startNotificationTimeout() {
        this._timeout = window.setTimeout(() => {
            this._timeout = null;
        }, 10 * 1000);  // ten second pause
        // }, 3 * 60 * 1000);  // three minute pause
    }

    _getNotification(title, body) {
        const notification = new Notification(title, {
            body,
            silent: true,

            badge: 'static/iconka_cat_power/cat_purr.png',
            image: 'static/iconka_cat_power/cat_purr.png',
            icon: 'static/iconka_cat_power/cat_purr.png',
        });
        setTimeout(notification.close.bind(notification), 4000);
    }

    sendNotification(title, body, createAlert) {
        if (!this._enabled || this._timeout) {
            return;
        }

        if (window.Notification && Notification.permission === "granted") {
            this._getNotification(title, body);
            this._startNotificationTimeout();
        }
        else if (window.Notification && Notification.permission !== "denied") {
            // dontBother is true if they didn't engage in turning on notifications.
            // just ask the one time per session.
            if (!this._dontBother) {
                $(window).one('focus', {}, () => {
                    createAlert({
                        content: 'You missed some messages while you were away. Turn on notifications to stop ignoring everyone!',
                        type: 'actionable',
                        actionText: 'Grant permissions',
                        actionCallback: () => Notification.requestPermission().then(perm => {
                            if (perm === 'default') {
                                this._dontBother = true;
                            }
                            else {
                                createAlert({
                                    content: perm === 'granted'
                                        ? 'Nice, now you\'ll know what\'s up. Go into client settings for more options.'
                                        : 'Okay, you won\'t get any notifications. I hope you enjoy being lonely.'
                                })
                            }
                        }),
                        dismissCallback: () => this._dontBother = true
                    });
                });
            }
        }
    }
}
