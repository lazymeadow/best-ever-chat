import Cookies from 'js-cookie';

export class Settings {
    static init() {
        Settings.username = Cookies.get('username');
        Settings.activeRoom = parseInt(localStorage.getItem(`${Settings.userId}.activeRoom`)) || 0;
        Settings.faction = Cookies.get('faction');
        Settings.color = Cookies.get('color');
        Settings.soundSet = Cookies.get('soundSet');
        Settings.timestamps = Cookies.get('timestamps');
    }

    static get userId() {
        return Cookies.get('id');
    }

    static get username() {
        return localStorage.getItem(`${Settings.userId}.username`);
    }

    static set username(username) {
        localStorage.setItem(`${Settings.userId}.username`, username);
    }

    static get faction() {
        return localStorage.getItem(`${Settings.userId}.faction`);
    }

    static set faction(faction) {
        localStorage.setItem(`${Settings.userId}.faction`, faction);
    }

    static get activeRoom() {
        return parseInt(localStorage.getItem(`${Settings.userId}.activeRoom`));
    }

    static set activeRoom(roomId) {
        localStorage.setItem(`${Settings.userId}.activeRoom`, roomId);
    }

    static get color() {
        return localStorage.getItem(`${Settings.userId}.color`);
    }

    static set color(color) {
        localStorage.setItem(`${Settings.userId}.color`, color);
    }

    static get soundSet() {
        return localStorage.getItem(`${Settings.userId}.soundSet`);
    }

    static set soundSet(soundSet) {
        localStorage.setItem(`${Settings.userId}.soundSet`, soundSet);
    }

    static get timestamps() {
        return localStorage.getItem(`${Settings.userId}.timestamps`);
    }

    static set timestamps(timestamps) {
        localStorage.setItem(`${Settings.userId}.timestamps`, timestamps);
    }
}