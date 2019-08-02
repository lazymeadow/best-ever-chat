import {LoggingClass} from "./Logger";

export default class NotificationManager extends LoggingClass {
    constructor() {
        super('NotificationManager');
        this._enabled = false;
    }

    enableNotifications() {
        console.log('Notifications enabled');
        this._enabled = true;
    }

    disableNotifications() {
        console.log('Notifications disabled');
        this._enabled = false;
    }

    sendNotification(title, body) {
        console.log(title, body);
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
                let notif = new Notification(title, {
                    body,
                    silent: true,
                    badge: 'static/iconka_cat_power/cat_purr.png',
                    image: 'static/iconka_cat_power/cat_purr.png',
                    icon: 'static/iconka_cat_power/cat_purr.png',
                    requireInteraction: true
                });
            }
        });
    }
}
