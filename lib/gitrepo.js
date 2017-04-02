const assert = require('assert');
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const async = require('async');

const HookError = require('./hookError');

const gitExec = 'git';

const call = cb => err => cb(err);

function git(options, ...args) {
    let callback = args.pop();
    if (!_.isObject(options)) {
        args.unshift(options);
        options = {};
    }

    assert(_.isFunction(callback));
    assert(args.length);

    args.unshift(gitExec);

    let commandLine = args.join(' ');

    exec(commandLine, options, function (err, stdout, stderr) {
        if (err) {
            return callback(err);
        }

        callback(null, stdout);
    });
}

const originRegex = /^origin\s+(\S+)\s+\((?:fetch|push)\)$/mg;
const currentBranchRegex = /^\*\s(\S+)$/gm;

class GitRepo {

    constructor(dir, url, logger) {
        this.dir = dir;
        this.url = url;

        if (logger) {
            assert.ok(_.isFunction(logger.log));
            assert.ok(_.isFunction(logger.error));

            this.logger = logger;
        }
    }

    _logError(cb) {
        return (err, result) => {
            if (err) {
                if (this.logger) {
                    this.logger.error(err.toString());
                }
                return cb(err);
            }

            if (result) {
                return cb(null, result);
            }

            cb();
        }
    }

    _logExecOutput(prefix, cb) {
        if (_.isFunction(prefix)) {
            cb = prefix;
            prefix = '';
        }

        return (err, stdout, stderr) => {
            if (err) {
                return cb(err);
            }

            if (this.logger) {
                let message = [stdout || stderr];
                if (prefix) {
                    message.unshift(prefix);
                }
                this.logger.log(message.join(': '));
            }

            cb(null, stdout);
        }
    }

    init(autoclone, cb) {
        let self = this;
        async.waterfall([
            function (next) {
                fs.access(self.dir, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            return next(null, false);
                        }

                        return next(err);
                    }

                    next(null, true);
                });
            },
            function (exist, next) {
                if (exist) {
                    return next();
                }

                fs.mkdir(self.dir, next);
            },
            function (next) {
                let gitDir = path.join(self.dir, '.git');
                fs.stat(gitDir, function (err, stat) {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            return next(null, false);
                        }

                        return next(err);
                    }
                    next(null, stat);
                });
            },
            function (stat, next) {
                if (!stat) {
                    if (!autoclone) {
                        return next(new HookError('ENOEXIST', 'Repository not exist in directory'));
                    } else {
                        return self.clone(next);
                    }
                }
                if (!stat.isDirectory()) {
                    return next(new HookError('EFAILED', 'Wrong repository format'));
                }

                next();
            },
            function (next) {
                self.checkRemote(next);
            },
            function (next) {
                self.getBranch(next);
            },
            function (branch, next) {
                self.branch = branch;
                next();
            }
        ], self._logError(cb));
    }

    _getOptions() {
        return {
            cwd: this.dir
        }
    }

    clone(callback) {
        let startPath = path.resolve(path.join(this.dir, '..'));
        let options = {
            cwd: startPath
        };
        git(options, 'clone', this.url, this.dir, this._logExecOutput(call(callback)));
    }

    checkRemote(cb) {
        let self = this;
        async.waterfall([
            function (next) {
                git(self._getOptions(), 'remote', '-v', self._logExecOutput(next));
            },
            function (output, next) {
                let match;
                var found = true;
                while ((match = originRegex.exec(output)) !== null) {
                    found = found && (match[1] === self.url);
                }

                if (!found) {
                    return next(new HookError('EFAILED', 'Wrong repository'));
                }

                next();
            }
        ], self._logError(cb));
    }

    getBranch(cb) {
        let self = this;
        async.waterfall([
            function (next) {
                git(self._getOptions(), 'branch', self._logExecOutput(next));
            },
            function (output, next) {
                let match;
                let branch;
                while ((match = currentBranchRegex.exec(output)) !== null) {
                    branch = match[1];
                }

                if (!branch) {
                    return next(new HookError('EFAILED', 'No current branch'));
                }

                next(null, branch);
            }
        ], self._logError(cb));
    }

    setBranch(branchName, cb) {
        let self = this;
        async.waterfall([
            function (next) {
                git(self._getOptions(), 'checkout', branchName, self._logExecOutput(next));
            },
            function (output, next) {
                self.branch = branchName;

                next(null);
            }
        ], self._logError(cb));
    }

    pull(...args) {
        const next = args.pop();

        assert.ok(_.isFunction(next), 'No callback');

        const command = args.join(' ');

        git(this._getOptions(), 'pull', command, this._logError(this._logExecOutput(next)));
    }
}


module.exports = GitRepo;