import $ from 'jquery';
import {LoggingClass} from "../util";

export class Modal extends LoggingClass {
    constructor({title, message, content, buttonText, buttonClickHandler, showCancel = true, cancelText = 'Cancel', form = false}) {
        super('Modal');
        this.debug('Creating modal');
        const overlay = $('.overlay');

        this.modal = $('<div>');
        let messageDiv = $('<div>').addClass('message').text(message);
        this.modal.addClass('modal').addClass(form ? 'form' : '')
            .click(event => event.stopPropagation())
            .append($('<h1>').text(title))
            .append($('<div>')
                .append(messageDiv)
                .append(content)
                .append($('<div>').addClass('form-element')
                    .append(showCancel ? $('<button>').addClass('secondary').text(cancelText)
                        .click(event => {
                            event.stopPropagation();
                            this.modal.remove();
                            if (overlay.is(':empty')) {
                                overlay.hide();
                            }
                        }) : null)
                    .append(form ? $('<div>').addClass('flex-spacer') : null)
                    .append($('<button>').text(buttonText).click(event => {
                        event.stopPropagation();
                        const error = buttonClickHandler();
                        if (error) {
                            messageDiv.addClass('error').text(error);
                        }
                        else {
                            this.modal.remove();
                            if (overlay.is(':empty')) {
                                overlay.hide();
                            }
                        }
                    }))));

        overlay.append(this.modal).one('click', () => this.modal.remove()).show();
    }
}