class Alert extends LoggingClass {
    constructor({content, type = 'fade', actionText, actionCallback}) {
        super();
        this.debug('Creating alert');

        // create hidden alert
        this.alert = $('<div>').html(content).hide();

        const alertsBox = $('#alerts');

        if (type === 'fade') {
            // after timeout, slideUp alert. if empty, slide up box.
            window.setTimeout(() => {
                this._fade();
            }, 3500);
        }
        else if (type === 'dismiss') {
            this.alert.append($('<div>').addClass('alert-actions')
                .append($('<span>').addClass('alert-action').text('Dismiss').click(() => this._fade())));
        }
        else if (type === 'actionable') {
            this.alert.append($('<div>').addClass('alert-actions')
                .append($('<span>').text('Dismiss').click(() => this._fade()))
                .append($('<span>').text(actionText).click(() => {
                    actionCallback();
                    this._fade();
                })));
        }

        // append hidden alert
        alertsBox.prepend(this.alert);
        // slideDown alert
        this.alert.slideDown(500);
        // if previously empty, slideDown alerts box
        if (this.alert.is(':last-child')) {
            alertsBox.slideDown(500);
        }
    }

    _fade() {
        this.alert.slideUp(500, () => {
            this.alert.remove();
            if (alertsBox.is(':empty')) {
                alertsBox.slideUp(500);
            }
        });
    }
}