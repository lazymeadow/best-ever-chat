import $ from 'jquery';
import {LoggingClass} from "../util";

export class Modal extends LoggingClass {
    constructor({title, content, buttonText, buttonClickHandler, showCancel = true, cancelText = 'Cancel', form = false}) {
        super('Modal');
        this.debug('Creating modal');
        const overlay = $('.overlay');

        this.modal = $('<div>');
        this.modal.addClass('modal').addClass(form ? 'form' : '')
            .click(event => event.stopPropagation())
            .append($('<h1>').text(title))
            .append((form ? $('<form>') : $('<div>'))
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
                        buttonClickHandler();
                        this.modal.remove();
                        if (overlay.is(':empty')) {
                            overlay.hide();
                        }
                    }))));

        overlay.append(this.modal).one('click', () => this.modal.remove()).show();
    }
}