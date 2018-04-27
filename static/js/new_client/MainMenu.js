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
                        showCancel: true,
                        title: 'Client Settings',
                        content: $('<div>')
                            .append($('<div>').addClass('form-group')
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>').text('Tab Title').prop('for', 'tab_title'))
                                    .append($('<input>').prop('id', 'tab_title')))),
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
                () => false
            ))
            .append(this._new_menu_item(
                'Account Settings',
                'cogs',
                () => false
            ))
            .append(this._new_menu_item(
                'About',
                'question',
                () => false
            ))
            .append(this._new_menu_item(
                'Log Out',
                'sign-out',
                () => false
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
