import Cookies from 'js-cookie';

export class Settings {
    static init() {
        // set server values
        Settings.username = Cookies.get('username');
        Settings.faction = Cookies.get('faction');
        Settings.color = Cookies.get('color');
        Settings.soundSet = Cookies.get('soundSet');
        Settings.email = Cookies.get('email');

        // set value overrides
        Settings.volume = Settings.volume || Cookies.get('volume');
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

    static get activeRoom() {
        return parseInt(localStorage.getItem(`${Settings.userId}.activeRoom`)) || 0;
    }

    static set activeRoom(roomId) {
        localStorage.setItem(`${Settings.userId}.activeRoom`, roomId);
    }

    static get faction() {
        return localStorage.getItem(`${Settings.userId}.faction`);
    }

    static set faction(faction) {
        localStorage.setItem(`${Settings.userId}.faction`, faction);
    }

    static get color() {
        return localStorage.getItem(`${Settings.userId}.color`);
    }

    static set color(color) {
        localStorage.setItem(`${Settings.userId}.color`, color);
    }

    static get tabTitle() {
        return localStorage.getItem(`${Settings.userId}.tabTitle`) || '';
    }

    static set tabTitle(tabTitle) {
        if (tabTitle) {
            localStorage.setItem(`${Settings.userId}.tabTitle`, tabTitle);
        }
        else {
            localStorage.removeItem(`${Settings.userId}.tabTitle`);
        }
    }

    static get volume() {
        return localStorage.getItem(`${Settings.userId}.volume`);
    }

    static set volume(volume) {
        localStorage.setItem(`${Settings.userId}.volume`, volume);
    }

    static get soundSet() {
        return localStorage.getItem(`${Settings.userId}.soundSet`);
    }

    static set soundSet(soundSet) {
        localStorage.setItem(`${Settings.userId}.soundSet`, soundSet);
    }

    static get fontSize() {
        return localStorage.getItem(`${Settings.userId}.fontSize`) || 14;
    }

    static set fontSize(fontSize) {
        localStorage.setItem(`${Settings.userId}.fontSize`, fontSize);
    }

    static get hideImages() {
        const storedSetting = localStorage.getItem(`${Settings.userId}.hideImages`);
        return storedSetting === null ? true : storedSetting === 'true';
    }

    static set hideImages(hideImages) {
        localStorage.setItem(`${Settings.userId}.hideImages`, hideImages);
    }

    static get timestamps() {
        return localStorage.getItem(`${Settings.userId}.timestamps`) || 'date_time';
    }

    static set timestamps(timestamps) {
        localStorage.setItem(`${Settings.userId}.timestamps`, timestamps);
    }

    static get email() {
        return localStorage.getItem(`${Settings.userId}.email`) || '';
    }

    static set email(email) {
        localStorage.setItem(`${Settings.userId}.email`, email);
    }
}