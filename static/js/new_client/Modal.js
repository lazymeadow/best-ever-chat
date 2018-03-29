class Modal extends LoggingClass {
    constructor({title, content, buttonText, buttonClickHandler, showCancel, cancelText}) {
        super();
        this.debug('Creating modal');
        const overlay = $('.overlay');

        this.modal = $('<div>');
        this.modal.addClass('modal')
            .click(event => event.stopPropagation())
            .append(content)
            .append($('<button>').text(buttonText).click(event => {
                event.stopPropagation();
                buttonClickHandler();
                this.modal.remove();
                if (overlay.is(':empty')) {
                    overlay.hide();
                }
            }))
            .append(showCancel ? $('<button>').text(cancelText).click(event => {
                event.stopPropagation();
                this.modal.remove();
                if (overlay.is(':empty')) {
                    overlay.hide();
                }
            }) : null);

        overlay.append(this.modal).one('click', () => this.modal.remove()).show();
    }
}