import $ from 'jquery';
import {LoggingClass, Settings} from "../util";
import {Modal} from "./Modal";
import {BestColorPicker} from "./BestColorPicker";
import {Alert} from "./Alert";

export class MainMenu extends LoggingClass {
    constructor(chatClient, {clientSettings, userSettings, accountSettings, bugReport, featureRequest, about, adminTools}) {
        super('MainMenu');
        this._chatClient = chatClient;

        this._menuElement = $('#main_menu').next('.popout-menu');

        if (this._menuElement.hasClass('mobile')) {
            this._menuContents = this._menuElement.children().first();
        }
        else {
            this._menuContents = this._menuElement;
        }

        if (clientSettings) {
            this._addClientSettings();
        }
        if (userSettings) {
            this._addUserSettings();
        }
        if (accountSettings) {
            this._addAccountSettings();
        }
        if (bugReport) {
            this._addBugReport();
        }
        if (featureRequest) {
            this._addFeatureRequest();
        }
        if (about) {
            this._addAbout();
        }
        if (adminTools && Settings.userId === 'audrey') {
            this._addAdminTools();
        }
        this._menuContents.append(this._new_menu_item(
            'Log Out',
            ['fas', 'sign-out-alt'],
            () => window.location = '/logout'
        ));

    }

    _new_menu_item(title, icon, clickHandler) {
        return $('<span>').addClass('menu-item')
            .append($('<span>').addClass(`${icon[0]} fa-fw fa-${icon[1]}`))
            .append(title)
            .click(event => {
                event.stopPropagation();
                $('.overlay').hide();
                this._menuElement.hide();
                clickHandler();
            });
    }

    _addClientSettings() {
        this._menuContents.append(this._new_menu_item(
            'Client Settings',
            ['fas', 'desktop'],
            () => new Modal({
                form: true,
                title: 'Client Settings',
                content: () => {
                    let muted = Settings.muted;
                    let volume = Settings.volume;

                    const getButtonContents = () => {
                        let iconStackWrapper = $('<span>').addClass('fa-stack fa');
                        if (muted) {
                            return iconStackWrapper.append($('<i>').addClass('fas fa-volume-off fa-stack-2x')).append($('<i>').addClass('fas fa-ban fa-stack-2x text-danger'));
                        }
                        else if (volume > 50) {
                            return iconStackWrapper.append($('<i>').addClass('fas fa-volume-up fa-stack-2x'));
                        }
                        else {
                            return iconStackWrapper.append($('<i>').addClass('fas fa-volume-down fa-stack-2x'));
                        }
                    };

                    return $('<div>')
                        .append($('<div>').addClass('form-group')
                            // Browser tab title
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Tab Title', for: 'tab_title'}))
                                    .append($('<input>', {id: 'tab_title', placeholder: '<Room> | Best Evar Chat 3.0'})
                                        .val(Settings.tabTitle)))
                                // Volume
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Volume', for: 'volume'}))
                                    .append($('<input>', {
                                        id: 'volume',
                                        type: 'range',
                                        value: volume
                                    }).change(event => {
                                        volume = event.target.value;
                                        muted = parseInt(volume, 10) === 0;
                                        $('#muted').val(muted);
                                        if (!muted) {
                                            this._chatClient._soundManager.playActivate(volume);
                                        }
                                        $('#volume_button').html(getButtonContents());
                                    }))
                                    .append($('<div>', {id: 'volume_button'})
                                        .click(() => {
                                            muted = !muted;
                                            $('#volume_button').html(getButtonContents());
                                            $('#muted').val(muted);
                                        })
                                        .append(getButtonContents())))
                                .append($('<input>', {type: 'hidden', id: 'muted', value: muted}))
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
                                // Notifications
                                .append($('<div>').addClass('form-element')
                                    .append($('<label>', {text: 'Notifications', for: 'notifications'}))
                                    .append($('<select>', {id: 'notifications'})
                                        .append($('<option>', {value: 'all', text: 'All'}))
                                        .append($('<option>', {value: 'message', text: 'Just Messages'}))
                                        .append($('<option>', {value: 'status', text: 'Just Status'}))
                                        .val(Settings.notifications)
                                    ))
                        );
                },
                buttonText: 'Save',
                buttonClickHandler: () => {
                    let changesMade = false;

                    const tabTitle = $('#tab_title').val();
                    if (tabTitle !== Settings.tabTitle) {
                        Settings.tabTitle = tabTitle;
                        this._chatClient.setWindowTitle();
                        changesMade = true;
                    }

                    const fontSize = $('#font_size').val();
                    if (fontSize !== Settings.fontSize) {
                        Settings.fontSize = fontSize;
                        $('body')[0].style.fontSize = `${Settings.fontSize}px`;
                        changesMade = true;
                    }

                    const hideImages = $('#hide_images').prop('checked');
                    const timeStamps = $('#timestamps').val();
                    if (hideImages !== Settings.hideImages || timeStamps !== Settings.timestamps) {
                        Settings.hideImages = hideImages;
                        Settings.timestamps = timeStamps;
                        this._chatClient.reprintLog();
                        changesMade = true;
                    }

                    const muted = $('#muted').val() === 'true';
                    if (muted !== Settings.muted) {
                        Settings.muted = muted;
                        changesMade = true;
                        new Alert({content: muted ? 'Sounds off.' : 'Sound on.'});
                    }

                    const notifications = $('#notifications').val();
                    if (notifications !== Settings.notifications) {
                        Settings.notifications = notifications;
                        changesMade = true;
                    }

                    let serverChanges = {};
                    const newVolume = $('#volume').val();
                    if (newVolume !== Settings.volume) {
                        serverChanges['volume'] = newVolume;
                        changesMade = true;
                    }
                    const newSoundSet = $('#sound_set').val();
                    if (newSoundSet !== Settings.soundSet) {
                        serverChanges['soundSet'] = newSoundSet;
                        changesMade = true;
                    }
                    if (Object.keys(serverChanges).length > 0) {
                        this._chatClient.updateClientSettings(serverChanges);
                    }

                    if (changesMade) {
                        this.debug('Client settings saved!');
                    }
                    else {
                        new Alert({content: 'No changes made.'});
                        this.debug('No changes made to client settings.');
                    }
                }
            })
        ));
    }

    _addUserSettings() {
        this._menuContents.append(this._new_menu_item(
            'User Settings',
            ['far', 'user-circle'],
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
                                    .append($('<i>').addClass(`fab fa-fw ${Settings.faction}`))
                                    .append($('<select>', {id: 'faction'})
                                        .append(Object.entries(Settings.allowedFactions).map(([displayName, value]) => $('<option>', {
                                            text: displayName,
                                            value: value
                                        })))
                                        .val(Settings.faction)))
                        ),
                    buttonText: 'Save',
                    buttonClickHandler: () => {
                        let serverChanges = {};

                        const newUsername = $('#username').val();
                        if (newUsername.length > 32) {
                            return 'Username is too long.';
                        }
                        if (newUsername !== Settings.username) {
                            serverChanges['username'] = newUsername;
                        }
                        const newColor = colorPicker.color;
                        if (newColor !== Settings.color) {
                            serverChanges['color'] = newColor;
                        }
                        const newFaction = $('#faction').val();
                        if (newFaction !== Settings.faction) {
                            serverChanges['faction'] = newFaction;
                        }

                        if (Object.keys(serverChanges).length === 0) {
                            new Alert({content: 'No changes made.'});
                            this.debug('No changes made to user settings.');
                        }
                        else {
                            this._chatClient.updateUserSettings(serverChanges);
                            this.debug('User settings saved!');
                        }
                    }
                });
            }
        ));
    }

    _addAccountSettings() {
        this._menuContents.append(this._new_menu_item(
            'Account Settings',
            ['fas', 'cogs'],
            () => new Modal({
                form: true,
                title: 'Account Settings',
                content: $('<div>')
                    .append($('<div>').addClass('form-group')
                        // Email
                            .append($('<div>').addClass('form-element')
                                .append($('<label>', {text: 'Email Address', for: 'email'}))
                                .append($('<input>', {
                                    id: 'email',
                                    type: 'email',
                                    autocomplete: 'email'
                                }).val(Settings.email)))
                            // Password
                            .append($('<div>').addClass('form-element')
                                .append($('<label>', {text: 'New Password', for: 'password1'}))
                                .append($('<input>', {
                                    id: 'password1',
                                    type: 'password',
                                    placeholder: 'Type password',
                                    autocomplete: "new-password"
                                })))
                            .append($('<div>').addClass('form-element')
                                .append($('<label>', {text: '', for: 'password2'}))
                                .append($('<input>', {
                                    id: 'password2',
                                    type: 'password',
                                    placeholder: 'Confirm password',
                                    autocomplete: "new-password"
                                })))
                    ),
                buttonText: 'Save',
                buttonClickHandler: () => {
                    let serverChanges = {};

                    let email = $('#email');
                    if (!email[0].checkValidity()) {
                        return 'That is an invalid email address.';
                    }
                    email = email.val();
                    if (email !== Settings.email) {
                        serverChanges['email'] = email;
                    }

                    const password1 = $('#password1').val();
                    const password2 = $('#password2').val();
                    if (password1 !== password2) {
                        return 'Passwords do not match.';
                    }
                    serverChanges = {...serverChanges, password1, password2};
                    this._chatClient.updateAccountSettings(serverChanges);
                    this.debug('Account settings saved!');
                }
            })
        ));
    }

    _addBugReport() {
        this._menuContents.append(this._new_menu_item(
            'Bug Report',
            ['fas', 'bug'],
            () => {
                new Modal({
                    form: true,
                    title: 'Report a Bug',
                    message: 'You found a bug? Nice job!',
                    content: $('<div>').addClass('form-group')
                        .append($('<div>').addClass('form-element')
                            .append($('<label>', {text: 'Title', for: 'title'}))
                            .append($('<input>', {
                                id: 'title',
                                type: 'text',
                                value: ''
                            })))
                        .append($('<div>').addClass('form-element')
                            .append($('<label>', {text: 'Body', for: 'body'}))
                            .append($('<textarea>', {
                                id: 'body',
                                value: ''
                            }))),
                    buttonText: 'Send it in!',
                    cancelText: 'Nevermind',
                    buttonClickHandler: () => {
                        const title = $('#title').val();
                        if (!title) {
                            return 'A title is required.';
                        }
                        if (title) {
                            this._chatClient.submitBug({
                                title: `[Best Evar Chat] ${title} (submitted by ${Settings.userId})`,
                                body: $('#body').val()
                            });
                        }
                    }
                });
            }
        ));
    }

    _addFeatureRequest() {
        this._menuContents.append(this._new_menu_item(
            'Feature Request',
            ['fas', 'heart'],
            () => {
                new Modal({
                    form: true,
                    title: 'Request a Feature',
                    message: 'So, this chat isn\'t good enough for you? Fine! What do you want?',
                    content: $('<div>').addClass('form-group')
                        .append($('<div>').addClass('form-element')
                            .append($('<label>', {text: 'Title', for: 'title'}))
                            .append($('<input>', {
                                id: 'title',
                                type: 'text',
                                value: ''
                            })))
                        .append($('<div>').addClass('form-element')
                            .append($('<label>', {text: 'Body', for: 'body'}))
                            .append($('<textarea>', {
                                id: 'body',
                                value: ''
                            }))),
                    buttonText: 'Awesome!',
                    cancelText: 'Just kidding',
                    buttonClickHandler: () => {
                        const title = $('#title').val();
                        if (!title) {
                            return 'A title is required.';
                        }
                        if (title) {
                            this._chatClient.submitFeature({
                                title: `[Best Evar Chat] ${title} (submitted by ${Settings.userId})`,
                                body: $('#body').val()
                            });
                        }
                    }
                });
            }
        ));
    }

    _addAbout() {
        this._menuContents.append(this._new_menu_item(
            'About',
            ['fas', 'question'],
            () => {
                new Modal({
                    showCancel: false,
                    title: 'About',
                    content: $('<div>')
                        .append('<h3>3.3.0</h3><em>August 2nd, 2019</em><p>Good news, everyone!</p><p>There\'s no longer any excuse for missing messages. Best Evar Chat 3.3 supports notifications!</p>')
                        .append('<h3>3.2.1</h3><em>July 19th, 2019</em><p>Fixes various bugs. I\'m not going to list them all, they\'re not that important.</p>')
                        .append('<h3>3.2.0</h3><em>July 19th, 2019</em><p>Fixes some image sharing bugs.</p><p>IMAGE UPLOAD!!!!</p>')
                        .append('<h3>3.1.1</h3><em>May 10th, 2019</em><p>Fixes bug that prevented users from moving out of the inactive list when connecting.</p><p>Parses emojis in alerts.</p>')
                        .append('<h3>3.1.0</h3><em>May 10th, 2019</em><p>We are all sick and tired of seeing all those users that will never log in again. Now they\'re under a fold, so you can ignore them completely for the rest of your life!</p>')
                        .append('<h3>3.0.2</h3><em>May 10th, 2019</em><p>Chat input will focus on window focus, room select, and thread select.</p>')
                        .append('<h3>3.0.1: Bug Fixes!</h3><em>January 5th, 2019</em><p>Enforcing limit on private message threads. Memory usage was getting out of hand (you know who you are).</p>')
                        .append('<h3>Welcome to Best Evar Chat 3.0!</h3><em>November 18th, 2018</em><p>It\'s here!</p>'),
                    buttonText: 'Fantastic!',
                    buttonClickHandler: () => false
                });
            }
        ));
    }

    _addAdminTools() {
        this._menuContents.append(this._new_menu_item(
            'Admin Tools',
            ['fas', 'feather-alt'],
            () => {
                new Modal({
                    showCancel: false,
                    title: 'Super Secret Stuff',
                    content: $('<div>').text('yeah you know this is where the cool kids go'),
                    buttonText: '1337',
                    buttonClickHandler: () => false
                });
            }
        ));
    }
}
