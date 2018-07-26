import $ from 'jquery';
import {LoggingClass} from "../client/LoggingClass";


export class Alert extends LoggingClass {
    constructor({content, type = 'fade', actionText, actionCallback, dismissText = 'Dismiss', dismissCallback}) {
        super();
        this.debug('Creating alert');

        // create hidden alert
        this.alert = $('<div>').html(content).hide();

        this.alertsBox = $('#alerts');

        if (type === 'fade') {
            // after timeout, slideUp alert. if empty, slide up box.
            window.setTimeout(() => {
                this._fade();
            }, 3500);
        }
        else if (type === 'dismiss') {
            this.alert.append($('<div>').addClass('alert-actions')
                .append(this._dismissElement(dismissText, dismissCallback)));
        }
        else if (type === 'actionable') {
            this.alert.append($('<div>').addClass('alert-actions')
                .append(this._dismissElement(dismissText, dismissCallback))
                .append($('<span>').text(actionText).click(() => {
                    actionCallback();
                    this._fade();
                })));
        }

        // append hidden alert
        this.alertsBox.prepend(this.alert);
        // slideDown alert
        this.alert.slideDown(500);
        // if previously empty, slideDown alerts box
        if (this.alert.is(':last-child')) {
            this.alertsBox.slideDown(500);
        }
    }

    _fade() {
        this.alert.slideUp(500, () => {
            this.alert.remove();
            if (this.alertsBox.is(':empty')) {
                this.alertsBox.slideUp(500);
            }
        });
    }

    _dismissElement(dismissText, dismissCallback) {
        return $('<span>').text(dismissText).click(() => {
            if (dismissCallback) {
                dismissCallback();
            }
            this._fade()
        });
    }
}