import $ from 'jquery';
import Settings from './Settings'

export class SoundManager {
    constructor() {
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
    }

    playSent() {
        if (!this._receiveSound.prop('muted'))
            this._receiveSound[0].play();
    }

    playReceived() {
        if (!this._sendSound.prop('muted'))
            this._sendSound[0].play();
    }

    playConnected() {
        if (!this._connectSound.prop('muted'))
            this._connectSound[0].play();
    }

    playDisconnected() {
        if (!this._disconnectSound.prop('muted'))
            this._disconnectSound[0].play();
    }

    playActivate() {
        if (!this._activateSound.prop('muted'))
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