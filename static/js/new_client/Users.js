class UserManager extends LoggingClass {
    constructor() {
        super();
        this._userListElement = $('#user-list');
        this._userDataMap = new Map();
    }

    updateUserList(newUsers) {
        newUsers.forEach((userData) => {
            if (userData['real_name'] !== Settings.userId) {
                this._addUser(userData)
            }
        });
    }

    _addUser(userData) {
        if (this._userDataMap.has(userData['real_name'])) {
            // if it's already in the map, update it
            this._userDataMap.get(userData['real_name']).updateUser(userData);
        }
        else {
            // otherwise, add a new user
            let user = new User(userData);
            this._userDataMap.set(userData['real_name'], user);
            this._userListElement.append(user.template);
        }
    }
}
