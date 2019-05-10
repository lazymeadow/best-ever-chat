import $ from 'jquery';
import {LoggingClass, Settings} from "../util";

export class User extends LoggingClass {
    constructor({username, color, faction, status, typing, id, lastActive}, userManager) {
        super('User');
        this._userManager = userManager;

        this.username = username;
        this.color = color;
        this.faction = faction;
        this.status = status;
        this.typing = typing;
        this.id = id;
        this.lastActive= lastActive;
        this._threadMessages = new Set();

        if (this.id !== Settings.userId) {
            this._iconElement = $('<span>').addClass('online-status fa-stack fa-1x')
                .append($('<i>').addClass('fas fa-circle fa-stack-1x'))
                .append($('<i>', {faction: true}).addClass(`fab fa-stack-1x fa-inverse fa-${this.faction}`));

            this._userElement = $('<div>', {title: `${this.username} (${this.id})`})
                .append($('<span>').addClass('message-indicator fas fa-fw fa-star'))
                .append(this._iconElement)
                .append($('<span>').addClass('list-content').text(this.username))
                .append($('<span>').addClass('typing-status far fa-fw fa-comment-dots'))
                .addClass(Settings.activeLogId === this.id ? 'current' : '')
                .addClass(this.status);
        }
        else {
            this._userElement = $('#current-user');
            this._userElement.find('.list-content').text(this.username);
            this._userElement.addClass(this.status)
                .addClass(Settings.activeLogId === this.id ? 'current' : '')
                .addClass(Settings.activeLogId === this.typing ? 'is-typing' : '')
                .prop('title', `${this.username} (${this.id})`);

            this._iconElement = this._userElement.find('.online-status');
            this._iconElement.addClass('fa-stack fa-1x')
                .append($('<i>').addClass('fas fa-circle fa-stack-1x'))
                .append($('<i>', {faction: true}).addClass(`fab fa-stack-1x fa-inverse fa-${this.faction}`));
        }
        this._userElement.click(() => this._selectThisThread());
    }

    get template() {
        return this.id !== Settings.userId ? this._userElement : undefined;
    }


    // Public functions

    updateTypingStatus() {
        if ((Settings.activeLogId === this.typing) || (Settings.activeLogId === this.id && Settings.userId === this.typing)) {
            this._userElement.addClass('is-typing');
        }
        else {
            this._userElement.removeClass('is-typing');
        }
    }

    updateUser({username, color, faction, status, typing}) {
        if (username !== this.username) {
            this.username = username;
            this._userElement.find('.list-content')
                .text(this.username)
                .prop('title', `${this.username} (${this.id})`);
        }
        if (faction !== this.faction) {
            const oldFaction = this.faction;
            this.faction = faction;
            this._iconElement.find('[faction=true]').toggleClass(`fa-${oldFaction} fa-${this.faction}`);
        }
        const oldStatus = this.status;
        this.status = status;
        this._userElement.removeClass(oldStatus).addClass(this.status)
            .addClass(Settings.activeLogId === this.id ? 'current' : '');
        this.typing = typing;
        this.updateTypingStatus();
        if (Settings.userId !== this.id) {
            this._userElement.click(() => this._selectThisThread());
        }
        this.color = color;
    }


    addPrivateMessageThread({messages}) {
        this._threadMessages = new Set(messages);
    }

    addMessage(messageData, show_indicator = true) {
        this._threadMessages.add(messageData);
        if (show_indicator) {
            this._userElement.addClass('has-messages');
        }
        return this._threadMessages.size;
    }

    // Private functions

    _selectThisThread() {
        $('.current').removeClass('current');
        this._userElement.addClass('current');
        this._userElement.removeClass('has-messages');
        this._userManager.setActiveThread(this.id);
    }
}
