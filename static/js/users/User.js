import $ from 'jquery';
import {LoggingClass, Settings} from "../util";

export class User extends LoggingClass {
    constructor({username, color, faction, status, typing, id}) {
        super();
        this.username = username;
        this.color = color;
        this.faction = faction;
        this.status = status;
        this.typing = typing;
        this.id = id;

        if (this.id !== Settings.userId) {
            this._iconElement = $('<span>').addClass('online-status fa-stack fa-1x')
                .append($('<i>').addClass('fas fa-circle fa-stack-1x'))
                .append($('<i>', {faction: true}).addClass(`fab fa-stack-1x fa-inverse fa-${this.faction}`));

            this._userElement = $('<div>', {title: this.id})
                .append(this._iconElement)
                .append($('<span>').addClass('list-content').text(this.username))
                .append($('<span>').addClass('typing-status far fa-fw fa-comment-dots'))
                .removeClass().addClass(this.status);
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
        this._userElement.removeClass().addClass(status);
        this.color = color;
    }


    // Private functions
}
