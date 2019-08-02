import $ from 'jquery';
import {LoggingClass} from "./Logger";

export default class NotificationManager extends LoggingClass {
    constructor(createAlert) {
        super('NotificationManager');
        this._createAlert = createAlert;
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
    }

    _doPermissionsOrNotification(notificationTitle, notificationOptions) {
        if (window.Notification && Notification.permission === "granted") {
            const notification = new Notification(notificationTitle, {
                tag: 'chatNotification',
                silent: true,
                renotify: true,
                icon: 'static/favicon.png',
                ...notificationOptions
            });
            this._startNotificationTimeout();
        }
        else if (window.Notification && Notification.permission !== "denied") {
            // dontBother is true if they didn't engage in turning on notifications. just ask the one time per session.
            if (this._dontBother) {
                return;
            }
            this._dontBother = true;  // don't bother them more than once
            $(window).one('focus', {}, () => {
                this._createAlert({
                    content: 'You missed some messages while you were away. Turn on notifications to stop ignoring everyone!',
                    type: 'actionable',
                    actionText: 'Grant permissions',
                    actionCallback: () => Notification.requestPermission().then(perm => {
                        if (perm !== 'default') {
                            this._createAlert({
                                content: perm === 'granted'
                                    ? 'Nice! Go into client settings for more options.'
                                    : 'Okay, you won\'t get any notifications. I hope you enjoy being lonely.'
                            })
                        }
                    })
                });
            });
        }
    }

    sendStatusNotification(title, body, whichCat) {
        if (!this._enabled) {  // status notifications ignore the timeout?
            return;
        }

        const image = `static/iconka_cat_power/cat_${whichCat}.png`;
        const options = {
            body,
            tag: 'chatStatusNotification',
            badge: image,
            image: image,
        };
        this._doPermissionsOrNotification(title, options);
    }


    sendMessageNotification(title, body, whichCat) {
        // if notifications are currently disabled (the window is focused) or are in timeout, just don't
        if (!this._enabled || this._timeout) {
            return;
        }

        const image = `static/iconka_cat_power/cat_${whichCat}.png`;
        const options = {
            body,
            tag: 'chatMessageNotification',
            badge: image,
            image: image,
        };
        this._doPermissionsOrNotification(title, options);
    }
}
