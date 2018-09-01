import $ from 'jquery';
import {LoggingClass, Settings} from "../util";

export class User extends LoggingClass {
    constructor({username, color, faction, status, typing, id}, userManager) {
        super();
        this._userManager = userManager;

        this.username = username;
        this.color = color;
        this.faction = faction;
        this.status = status;
        this.typing = typing;
        this.id = id;
        this._threadMessages = new Set();

        if (this.id !== Settings.userId) {
            this._iconElement = $('<span>').addClass('online-status fa-stack fa-1x')
                .append($('<i>').addClass('fas fa-circle fa-stack-1x'))
                .append($('<i>', {faction: true}).addClass(`fab fa-stack-1x fa-inverse fa-${this.faction}`));

            this._userElement = $('<div>', {title: this.id})
                .append($('<span>').addClass('message-indicator fas fa-fw fa-star'))
                .append(this._iconElement)
                .append($('<span>').addClass('list-content').text(this.username))
                .append($('<span>').addClass('typing-status far fa-fw fa-comment-dots'))
                .addClass(Settings.activeLogId === this.id ? 'current' : '')
                .addClass(this.status);
            this._userElement.click(() => this._selectThisThread());
        }
        else {
            this._userElement = $('#current-user');
            this._userElement.find('.list-content').text(this.username);
            this._userElement.addClass(this.status).prop('title', this.id);

            this._iconElement = this._userElement.find('.online-status');
            this._iconElement.addClass('fa-stack fa-1x')
                .append($('<i>').addClass('fas fa-circle fa-stack-1x'))
                .append($('<i>', {faction: true}).addClass(`fab fa-stack-1x fa-inverse fa-${this.faction}`));
        }
    }

    get template() {
        // TODO is this necessary? don't know if returning would be okay on current user
        return this.id !== Settings.userId ? this._userElement : undefined;
    }


    // Public functions

    updateUser({username, color, faction, status, typing}) {
        if (username !== this.username) {
            this.username = username;
            this._userElement.find('.list-content').text(this.username);
        }
        if (faction !== this.faction) {
            const oldFaction = this.faction;
            this.faction = faction;
            this._iconElement.find('[faction=true]').toggleClass(`fa-${oldFaction} fa-${this.faction}`);
        }
        const oldStatus = this.status;
        this.status = status;
        this._userElement.removeClass(oldStatus).addClass(this.status)
            .addClass(Settings.activeLogId === this.id ? 'current' : '')
            .click(() => this._selectThisThread());
        this.color = color;
    }


    addPrivateMessageThread({messages}) {
        this._threadMessages = new Set(messages);
    }

    addMessage(messageData, show_indicator = true) {
        this._threadMessages.add(messageData);
        if (show_indicator && Settings.activeLogId !== this.id) {
            this._userElement.addClass('has-messages');
        }
    }

    // Private functions

    _selectThisThread() {
        $('.current').removeClass('current');
        this._userElement.addClass('current');
        this._userElement.removeClass('has-messages');
        this._userManager.setActiveThread(this.id);
    }
}
