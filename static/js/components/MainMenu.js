import $ from 'jquery';
import {LoggingClass, Settings} from "../util";
import {Modal} from "./Modal";
import {BestColorPicker} from "./BestColorPicker";

const accountSettingsModal = () => new Modal({
    form: true,
    title: 'Account Settings',
    content: $('<div>')
        .append($('<div>').addClass('form-group')
            // Email
                .append($('<div>').addClass('form-element')
                    .append($('<label>', {text: 'Email Address', for: 'email'}))
                    .append($('<input>', {id: 'email'})))
                // Password
                .append($('<div>').addClass('form-element')
                    .append($('<label>', {text: 'Change Password', for: 'password1'}))
                    .append($('<input>', {id: 'password1', type: 'password', placeholder: 'New password'})))
                .append($('<div>').addClass('form-element')
                    .append($('<label>', {text: '', for: 'password2'}))
                    .append($('<input>', {id: 'password2', type: 'password', placeholder: 'Confirm password'})))
        ),
    buttonText: 'Save',
    buttonClickHandler: () => {
        this.debug('Account settings saved!');
    }
});

export class MainMenu extends LoggingClass {
    constructor(client) {
        super();
        this._client = client;
        this._menuContents = $('#main_menu').next('.popout-menu');

        this._menuContents
            .append(this._new_menu_item(
                'Client Settings',
                'desktop',
                () => new Modal({
                    form: true,
                    title: 'Client Settings',
                    content: $('<div>')
                        .append($('<div>').addClass('form-group')
                            // Browser tab title
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Tab Title', for: 'tab_title'}))
                                    .append($('<input>', {id: 'tab_title', placeholder: 'Room | Best Evar Chat 3.0'})
                                        .val(Settings.tabTitle)))
                                // Volume
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Volume', for: 'volume'}))
                                    .append($('<input>', {id: 'volume', type: 'range'}).val(Settings.volume))
                                    .append($('<div>', {id: 'volume_button'})
                                        .append($('<span>').addClass('fa-stack fa')
                                            .append($('<i>').addClass('fa fa-volume-down fa-stack-2x')))))
                                // Sound set
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Sound Set', for: 'sound_set'}))
                                    .append($('<select>', {id: 'sound_set'})
                                        .append($.map(['AIM', 'MSN'], item => {
                                            return $('<option>', {value: item, text: item});
                                        })).val(Settings.soundSet)))
                                // Client font size
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Font Size', for: 'font_size'}))
                                    .append($('<select>', {id: 'font_size'})
                                        .append($.map([12, 14, 16, 18, 20, 22, 24], item => {
                                            return $('<option>', {value: item, text: item});
                                        })).val(Settings.fontSize)))
                                // Hide images by default
                                .append($('<div>').addClass('form-element check-box')
                                    .append($('<label>', {text: 'Hide images by default', for: 'hide_images'}))
                                    .append($('<input>', {
                                        type: 'checkbox',
                                        id: 'hide_images'
                                    }).prop('checked', Settings.hideImages))
                                    .append($('<label>', {for: 'hide_images'}).addClass('check-box')))
                                // Timestamp mode
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Timestamps', for: 'timestamps'}))
                                    .append($('<select>', {id: 'timestamps'})
                                        .append($('<option>', {value: 'date_time', text: 'Date & Time'}))
                                        .append($('<option>', {value: 'just_time', text: 'Just Time'}))
                                        .append($('<option>', {value: 'off', text: 'Off'}))
                                        .val(Settings.timestamps)
                                    ))
                        ),
                    buttonText: 'Save',
                    buttonClickHandler: () => {
                        Settings.tabTitle = $('#tab_title').val();
                        Settings.volume = $('#volume').val();
                        Settings.soundSet = $('#sound_set').val();
                        Settings.fontSize = $('#font_size').val();
                        Settings.hideImages = $('#hide_images').prop('checked');
                        Settings.timestamps = $('#timestamps').val();
                        this._client.updateClientSettings();
                        this.debug('Client settings saved!');
                    }
                })
            ))
            .append(this._new_menu_item(
                'User Settings',
                'user-circle-o',
                () => {
                    const colorPicker = new BestColorPicker($('<div>', {id: 'color'}));
                    return new Modal({
                        form: true,
                        title: 'User Settings',
                        content: $('<div>')
                            .append($('<div>').addClass('form-group')
                                // Display name
                                    .append($('<div>').addClass('form-element')
                                        .append($('<label>', {text: 'Display Name', for: 'username'}))
                                        .append($('<input>', {id: 'username'}).val(Settings.username)))
                                    // Color
                                    .append($('<div>').addClass('form-element')
                                        .append($('<label>', {text: 'Color', for: 'color'}))
                                        .append(colorPicker.element))
                                    // Faction
                                    .append($('<div>').addClass('form-element')
                                        .append($('<label>', {text: 'Faction', for: 'faction'}))
                                        .append($('<select>', {id: 'faction'})
                                            .append($('<option>', {value: 'ra', text: 'Rebel Alliance'}))
                                            .append($('<option>', {value: 'ge', text: 'Galactic Empire'}))
                                            .val(Settings.faction)))
                            ),
                        buttonText: 'Save',
                        buttonClickHandler: () => {
                            Settings.username = $('#username').val();
                            Settings.color = colorPicker.color;
                            Settings.faction = $('#faction').val();
                            this._client.updateUserSettings();
                            this.debug('User settings saved!');
                        }
                    });
                }
            ))
            .append(this._new_menu_item(
                'Account Settings',
                'cogs',
                accountSettingsModal
            ))
            .append(this._new_menu_item(
                'About',
                'question',
                () => {
                    new Modal({
                        showCancel: false,
                        title: 'About',
                        content: $('<div>').text('Figure out a way to get this dynamically populated.'),
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