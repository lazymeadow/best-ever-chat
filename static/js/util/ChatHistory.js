/**
 * Chat history as a navigable list which remembers the current position and enforces uniqueness of items
 * and length of history
 */
class ChatHistory {
    constructor() {
        this._history = [];
        this._currentIndex = 0;
        // limit the history from getting too big
        this.MAX_HISTORY_LENGTH = 100;
    }

    reset() {
        this._currentIndex = 0;
    }

    getNext() {
        if (this._currentIndex < this._history.length) {
            this._currentIndex++;
        }
        return this._history[this._history.length - this._currentIndex];
    }

    getPrevious() {
        if (this._currentIndex > 1) {
            this._currentIndex--;
        }
        return this._history[this._history.length - this._currentIndex];
    }

    addMessage(message, ifAtEnd=false) {
        if ((ifAtEnd && this._currentIndex === 1) || (!ifAtEnd && message !== this._history[this._history.length - 1])) {
            // no dupes
            const existingIndex = this._history.indexOf(message);
            if (existingIndex >= 0) {
                this._history.splice(existingIndex, 1);
            }
            this._history.push(message);
            if (this._history.length > this.MAX_HISTORY_LENGTH) {
                this._history.shift();
            }
        }
    }
}

export {ChatHistory};