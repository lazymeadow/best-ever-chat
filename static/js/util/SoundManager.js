import $ from 'jquery';
import {Settings} from './Settings'
import {LoggingClass} from "./Logger";

export class SoundManager extends LoggingClass {
    constructor() {
        super();
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
    }

    playDisconnected() {
        if (!Settings.muted)
            this._disconnectSound[0].play();
    }

    playActivate() {
        if (!Settings.muted)
            this._activateSound[0].play();
    }

    updateSoundSet() {
        let soundSet = Settings.soundSet;
        this._receiveSound.attr('src', `https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/${soundSet}/message-receive.wav`);
        this._sendSound.attr('src', `https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/${soundSet}/message-send.wav`);
        this._connectSound.attr('src', `https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/${soundSet}/user-online.wav`);
        this._disconnectSound.attr('src', `https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/${soundSet}/user-offline.wav`);
        this._activateSound.attr('src', `https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/${soundSet}/activate-sounds.wav`);
    }
}