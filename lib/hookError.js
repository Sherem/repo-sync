class HookError {
    constructor(code, message) {
        this.code = code;
        this.message = message;
        Error.captureStackTrace(this, HookError);
    }
}

module.exports = HookError;