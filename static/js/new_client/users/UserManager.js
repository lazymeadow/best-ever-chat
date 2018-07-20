class UserManager extends LoggingClass {
    constructor() {
        super();
        this._userListElement = $('#user-list');
        this._userDataMap = new Map();
    }

    updateUserList(newUsers) {
        this._userListElement.empty();
        newUsers.forEach((userData) => {
            this._addUser(userData)
        });
        _parseEmojis(this._userListElement);
    }

    _addUser(userData) {
        let user;
        if (this._userDataMap.has(userData['id'])) {
            // if it's already in the map, update it
            user = this._userDataMap.get(userData['id']);
            user.updateUser(userData);
        }
        else {
            // otherwise, add a new user
            user = new User(userData);
            this._userDataMap.set(userData['id'], user);
        }
        this._userListElement.append(user.template);
    }

    tmp_getUserIdList() {
        return this._userDataMap.keys();
    }
}
