class Settings {
    static get userId() {
        return Cookies.get('id');
    }

    static get username() {
        return Cookies.get('username');
    }

    static set username(username) {
        Cookies.set('username', username);
    }

    static get activeRoom() {
        return parseInt(localStorage.getItem('activeRoom')) || 0;
    }

    static set activeRoom(roomId) {
        localStorage.setItem('activeRoom', roomId);
    }

    static get soundSet() {
        return Cookies.get('sound_set');
    }

    static set soundSet(soundSet) {
        Cookies.set('sound_set', soundSet);
    }

    static get timestamps() {
        return localStorage.getItem('timestamps') || 'date_time';
    }

    static set timestamps(timestamps) {
        localStorage.setItem('timestamps', timestamps);
    }
}