function dynamic_modal(title, content, callback) {
    var newModal = $('<div>').addClass('modal')
        .prop('id', 'dynamic_modal')
        .append($('<div>').addClass('modal-header')
            .append($('<span>').addClass('modal-title')
                .text(title))
            .append($('<span>').addClass('close-icon fa fa-close')
                .click(function () {
                    toggleModal('dynamic_modal');
                    newModal.remove();
                })))
        .append($('<div>').addClass('modal-content')
            .append(content))
        .append($('<div>').addClass('modal-footer')
            .append($('<button>').addClass('modal-cancel')
                .prop('type', 'button')
                .text('Cancel')
                .click(function () {
                    toggleModal('dynamic_modal');
                    newModal.remove();
                }))
            .append($('<button>').addClass('modal-submit')
                .prop('type', 'button')
                .text('Submit')
                .click(function () {
                    toggleModal('dynamic_modal');
                    callback();
                    newModal.remove();
                })))
        .hide();
    $('#overlay').append(newModal);
    toggleModal('dynamic_modal');
}
