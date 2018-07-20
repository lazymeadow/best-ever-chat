class MainMenu extends LoggingClass {
    constructor(client) {
        super();
        this._client = client;
        this._menuContents = $('#main_menu').next('.popout-menu');

        this._menuContents
            .append(this._new_menu_item(
                'Client Settings',
                'desktop',
                () => {
                    new Modal({
                        form: true,
                        title: 'Client Settings',
                        content: $('<div>')
                            .append($('<div>').addClass('form-group')
                            // Browser tab title
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Tab Title', for: 'tab_title'}))
                                    .append($('<input>', {id: 'tab_title'})))
                                // Client font size
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Font Size', for: 'font_size'}))
                                    .append($('<select>', {id: 'font_size'})
                                        .append($.map([12, 14, 16, 18, 20, 22, 24], (item) => {
                                            return $('<option>', {value: item, text: item});
                                        }))))
                                // Hide images by default
                                .append($('<div>').addClass('form-element check-box')
                                    .append($('<label>', {text: 'Hide images by default', for: 'hide_images'}))
                                    .append($('<input>', {type: 'checkbox', id: 'hide_images'}))
                                    .append($('<label>', {for: 'hide_images'}).addClass('check-box')))
                                // Timestamp mode
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Timestamps', for: 'timestamps'}))
                                    .append($('<select>', {id: 'timestamps'})
                                        .append($('<option>', {value: 'date_time', text: 'Date & Time'}))
                                        .append($('<option>', {value: 'just_time', text: 'Just Time'}))
                                        .append($('<option>', {value: 'off', text: 'Off'}))))),
                        buttonText: 'Save',
                        buttonClickHandler: () => {
                            this.debug('Client settings saved');
                        }
                    });
                }
            ))
            .append(this._new_menu_item(
                'User Settings',
                'user-circle-o',
                () => {
                    new Modal({
                        form: true,
                        title: 'User Settings',
                        content: $('<div>'),
                        buttonText: 'Save',
                        buttonClickHandler: () => {
                            this.debug('User settings saved');
                        }
                    });
                }
            ))
            .append(this._new_menu_item(
                'Account Settings',
                'cogs',
                () => {
                    new Modal({
                        form: true,
                        title: 'Account Settings',
                        content: $('<div>'),
                        buttonText: 'Save',
                        buttonClickHandler: () => {
                            this.debug('Account settings saved');
                        }
                    });
                }
            ))
            .append(this._new_menu_item(
                'About',
                'question',
                () => {
                    new Modal({
                        showCancel: false,
                        title: 'About',
                        content: $('<div>'),
                        buttonText: 'Awesome!',
                        buttonClickHandler: () => false
                    });
                }
            ))
            .append(this._new_menu_item(
                'Log Out',
                'sign-out',
                () => window.location = '/logout'
            ));

    }

    _new_menu_item(title, icon, clickHandler) {
        return $('<span>').addClass('menu-item')
            .append($('<span>').addClass(`fa fa-fw fa-${icon}`))
            .append(title)
            .click(() => {
                $('.overlay').hide();
                this._menuContents.hide();
                clickHandler();
            });
    }
}
