class Logger {
    constructor() {
        this.logOutput = '';
        this.errOutput = '';
    }

    log(...msgs) {
        let message = msgs.join(' ');
        this.logOutput += message;
    }

    error(...msgs) {
        let message = msgs.join(' ');
        this.errOutput += message;
    }

}

module.exports = Logger;