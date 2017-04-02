class HookError {
    constructor(code, message) {
        this.code = code;
        this.message = message;
        Error.captureStackTrace(this, HookError);
    }

    toString() {
        return this.code + ': ' + this.message;
    }
}

module.exports = HookError;