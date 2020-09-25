import $ from 'jquery';
import {Settings} from './Settings'
import {LoggingClass} from "./Logger";

export class SoundManager extends LoggingClass {
    constructor() {
        super();

        this._soundAssetUrl = 'https://audio.bestevarchat.com';

        this._receiveSound = $('<audio>').attr('type', 'audio/mpeg');
        this._sendSound = $('<audio>').attr('type', 'audio/mpeg');
        this._connectSound = $('<audio>').attr('type', 'audio/mpeg');
        this._disconnectSound = $('<audio>').attr('type', 'audio/mpeg');
        this._activateSound = $('<audio>').attr('type', 'audio/mpeg');
        $('body').append(this._receiveSound)
            .append(this._sendSound)
            .append(this._connectSound)
            .append(this._disconnectSound)
            .append(this._activateSound);
        this.updateSoundSet();
        SoundManager.updateVolume();
    }

    static updateVolume() {
        $('audio').prop('volume', Settings.volume / 100);
    }

    playSent() {
        if (!Settings.muted)
            this._receiveSound[0].play();
        this.debug('Playing sent sound');
    }

    playReceived() {
        if (!Settings.muted)
            this._sendSound[0].play();
        this.debug('Playing received sound');
    }

    playConnected() {
        if (!Settings.muted)
            this._connectSound[0].play();
        this.debug('Playing connected sound');
    }

    playDisconnected() {
        if (!Settings.muted)
            this._disconnectSound[0].play();
        this.debug('Playing disconnected sound');
    }

    playActivate(volume) {
        if (volume) {
            this._activateSound.prop('volume', volume/100);
        }
        if (!Settings.muted)
            this._activateSound[0].play();
        this.debug('Playing activate sound');
    }

    updateSoundSet() {
        let soundSet = Settings.soundSet;
        this._receiveSound.attr('src', `${this._soundAssetUrl}/${soundSet}/message-receive.wav`);
        this._sendSound.attr('src', `${this._soundAssetUrl}/${soundSet}/message-send.wav`);
        this._connectSound.attr('src', `${this._soundAssetUrl}/${soundSet}/user-online.wav`);
        this._disconnectSound.attr('src', `${this._soundAssetUrl}/${soundSet}/user-offline.wav`);
        this._activateSound.attr('src', `${this._soundAssetUrl}/${soundSet}/activate-sounds.wav`);
    }
}