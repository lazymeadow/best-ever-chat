class UserManager {
    constructor() {
        this._userListElement = $('#user-list');
        this._userDataMap = new Map();
    }

    updateUserList() {

    }
}

class User {
    constructor(username, {color, faction, idle, typing, real_name: id}) {
        this.username = username;
        this.color = color;
        this.faction = faction;
        this.idle = idle;
        this.typing = typing;
        this.id = id;

        if (this.id !== Settings.userId) {
            this._userElement = $('<div>').append($('<div>')
                .append($('<span>').addClass(`online-status fa fa-fw fa-${this.faction === 'empire' ? 'ge' : 'ra'}`))
                .append($('<span>').addClass('list-content').text(this.username))
                .append($('<span>').addClass('typing-status fa fa-fw fa-commenting-o')));
        }
    }

    get template() {
        return this._userElement;
    }


    // Public functions

    updateUser(username, {color, faction, idle, typing, real_name: id}) {
        if (username !== this.username) {
            this.username = username;
            this._userElement.children('.list-content').text(this.username);
        }

    }


    // Private functions

    _setUserIdle(idleStatus) {
        this._userElement.removeClass().addClass(idleStatus ? 'idle' : 'active');
    }

}