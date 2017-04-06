class HookError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        Error.captureStackTrace(this, HookError);
    }

    toString() {
        return this.code + ': ' + this.message;
    }
}

module.exports = HookError;