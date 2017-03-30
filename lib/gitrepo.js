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

class GitRepo {

    constructor(dir, url) {
        this.dir = dir;
        this.url = url;
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
            }
        ], cb)
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
        git(options, 'clone', this.url, this.dir, call(callback));
    }

    checkRemote(callback) {
        let self = this;
        async.waterfall([
            function (next) {
                git(self._getOptions(), 'remote', '-v', next);
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
        ], callback)
    }
}


module.exports = GitRepo;