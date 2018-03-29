class Modal extends LoggingClass {
    constructor({title, content, buttonText, buttonClickHandler, showCancel, cancelText}) {
        super();
        this.debug('Creating modal');
        const overlay = $('.overlay');

        this.modal = $('<div>');
        this.modal.addClass('modal')
            .click((e) => e.stopPropagation())
            .append(content)
            .append($('<button>').text(buttonText).click(() => {
                buttonClickHandler();
                this.modal.remove();
                if (overlay.is(':empty')) {
                    overlay.hide();
                }
                return false;
            }))
            .append(showCancel ? $('<button>').text(cancelText).click(() => {
                this.modal.remove();
                if (overlay.is(':empty')) {
                    overlay.hide();
                }
                return false;
            }) : null);

        overlay.append(this.modal).one('click', () => this.modal.remove()).show();
    }
}