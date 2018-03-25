class Modal extends LoggingClass {
    constructor({title, content, buttonText, buttonClickHandler, showCancel, cancelText}) {
        super();
        this.debug('Creating modal');
        const overlay = $('.overlay');

        const modal = $('<div>').addClass('modal')
            .click((e) => e.stopPropagation())
            .append(content)
            .append($('<button>').text(buttonText).click(() => {
                buttonClickHandler();
                $('.modal').remove();
                overlay.hide();
            }))
            .append(showCancel ? $('<button>').text(cancelText).click(() => {
                $('.modal').remove();
                overlay.hide();
            }) : null);

        overlay.append(modal).one('click', () => modal.remove()).show();
    }
}