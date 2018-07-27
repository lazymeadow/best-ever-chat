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
            this._userElement = $('<div>').append($('<div>')
                .append($('<span>').addClass(`online-status fa fa-fw fa-${this.faction === 'empire' ? 'ge' : 'ra'}`))
                .append($('<span>').addClass('list-content').text(this.username))
                .append($('<span>').addClass('typing-status fa fa-fw fa-commenting-o')))
                .removeClass().addClass(this.status);
        }
        else {
            this._userElement = $('#current-user');
            this._userElement.find('.list-content').text(this.username);
            this._userElement.find('.online-status').addClass(`fa fa-fw fa-${this.faction === 'empire' ? 'ge' : 'ra'}`);
            this._userElement.addClass(this.status);
        }
    }

    get template() {
        return this.id !== Settings.userId ? this._userElement : undefined;
    }


    // Public functions

    updateUser({username, color, faction, status, typing, id}) {
        if (username !== this.username) {
            this.username = username;
            this._userElement.find('.list-content').text(this.username);
        }
        if (faction !== this.faction) {
            this.faction = faction;
            this._userElement.find('.online-status').toggleClass('fa-ge fa-ra');
        }
        this._userElement.removeClass().addClass(status);
        this.color = color;
    }


    // Private functions

}
