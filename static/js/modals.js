/*
options: {
    title: str,
    content: jquery element or str,
    callback: function on submit,
    submitText: str,
    showCancel: boolean,
    cancelText: str
}
 */

function dynamic_modal(options) {
    var newModal = $('<div>').addClass('modal')
        .prop('id', 'dynamic_modal')
        .append($('<div>').addClass('modal-header')
            .append($('<span>').addClass('modal-title')
                .text(options.title || ''))
            .append($('<span>').addClass('close-icon fa fa-close')
                .click(function () {
                    toggleModal('dynamic_modal');
                    newModal.remove();
                })))
        .append($('<div>').addClass('modal-content')
            .append(options.content))
        .append($('<div>').addClass('modal-footer')
            .append((options.showCancel || true) ? $('<button>').addClass('modal-cancel')
                .prop('type', 'button')
                .text(options.cancelText || 'Cancel')
                .click(function () {
                    toggleModal('dynamic_modal');
                    newModal.remove();
                }) : undefined)
            .append($('<button>').addClass('modal-submit')
                .prop('type', 'button')
                .text(options.submitText || 'Submit')
                .click(function () {
                    toggleModal('dynamic_modal');
                    options.callback();
                    newModal.remove();
                })))
        .hide();
    $('#overlay').append(newModal);
    toggleModal('dynamic_modal');
}
