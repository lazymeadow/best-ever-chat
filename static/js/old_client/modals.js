/*
options: {
    modalId: str,
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
        .prop('id', options.modalId)
        .append($('<div>').addClass('modal-header')
            .append($('<span>').addClass('modal-title')
                .text(options.title || ''))
            .append($('<span>').addClass('close-icon fas fa-close')
                .click(function () {
                    toggleModal(options.modalId);
                    newModal.remove();
                })))
        .append($('<div>').addClass('modal-content')
            .append(options.content))
        .append($('<div>').addClass('modal-footer')
            .append((options.showCancel || true) ? $('<button>').addClass('modal-cancel')
                .prop('type', 'button')
                .text(options.cancelText || 'Cancel')
                .click(function () {
                    toggleModal(options.modalId);
                    newModal.remove();
                }) : undefined)
            .append($('<button>').addClass('modal-submit')
                .prop('type', 'button')
                .text(options.submitText || 'Submit')
                .click(function () {
                    toggleModal(options.modalId);
                    options.callback();
                    newModal.remove();
                })))
        .hide();
    $('#overlay').append(newModal);
    toggleModal(options.modalId);
}

function toggleModal(modalId) {
    var modal = $('#' + modalId);
    if (modal.is(':visible')) {
        modal.hide();
        if (!$('.modal').is(':visible')) {  // no other modals are open
            $('#overlay').hide();
        }
    }
    else {
        modal.show();
        $('#overlay').show();
    }
}
