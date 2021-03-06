const fs = require('fs');
const exec = require('child_process').exec;
const path = require('path');
const assert = require('assert');

const async = require('async');
const _ = require('lodash');

const Logger = require('./lib/logger');

const tmpDir = '/tmp/gitOpTest';
const repository = 'git@github.com:Sherem/repo-sync.git';

const GitRepo = require('../lib/gitrepo')

let repoRoot;
let repoPath;

beforeEach(function (done) {
    repoRoot = fs.mkdtempSync(tmpDir);
    repoPath = path.join(repoRoot, 'testRepo');
    done();
});

afterEach(function (done) {
    exec('rm -rf ' + repoRoot, done);
})

describe('Git repository tester', function () {
    it('Should init repository class', function (done) {
        let gitRepo = new GitRepo(repoPath, repository);

        assert.equal(repoPath, gitRepo.dir);
        assert.equal(repository, gitRepo.url);

        done();
    });

    it('Should create directory for repository', function (done) {
        let gitRepo = new GitRepo(repoPath, repository);

        async.series([
            function (next) {
                gitRepo.init(false, (err) => {
                    assert(err);
                    assert.equal('ENOEXIST', err.code);
                    assert.equal('Repository not exist in directory', err.message);
                    next();
                });
            },
            function (next) {
                fs.access(repoPath, fs.constants.R_OK | fs.constants.W_OK, function (err) {
                    assert.ifError(err);
                    next();
                })
            }
        ], done)
    });

    it('Should clone directory for repository', function (done) {
        this.timeout(10000);
        let gitRepo = new GitRepo(repoPath, repository);

        async.waterfall([
            function (next) {
                gitRepo.init(true, next);
            },
            function (next) {
                let gitPath = path.join(repoPath, '.git');
                fs.stat(repoPath, next);
            },
            function (stat, next) {
                assert.ok(stat.isDirectory());
                next();
            }
        ], done)
    });

    it('Should open existing repository', function (done) {
        this.timeout(10000);
        let gitRepo = new GitRepo(repoPath, repository);

        let options = {
            cwd: path.resolve(path.join(repoPath, '..'))
        };

        async.waterfall([
            function (next) {
                let command = ['git clone', repository, repoPath];
                exec(command.join(' '), options, err => next(err));
            },
            function (next) {
                gitRepo.init(true, next);
            },
            function (next) {
                let gitPath = path.join(repoPath, '.git');
                fs.stat(repoPath, next);
            },
            function (stat, next) {
                assert.ok(stat.isDirectory());
                next();
            }
        ], done)
    });

    it('Should error if wrong repository exists on dir', function (done) {
        this.timeout(10000);
        let gitRepo = new GitRepo(repoPath, repository);

        let options = {
            cwd: path.resolve(path.join(repoPath, '..'))
        };

        async.waterfall([
            function (next) {
                let command = ['git clone', 'git@github.com:caolan/async.git', repoPath];
                exec(command.join(' '), options, err => next(err));
            },
            function (next) {
                gitRepo.init(true, function (err) {
                    assert.ok(err);
                    assert.equal('EFAILED', err.code);
                    assert.equal('Wrong repository', err.message);
                    next();
                });
            },
        ], done)
    });


    it('Should error if wrong repository format', function (done) {
        let gitRepo = new GitRepo(repoPath, repository);

        let options = {
            cwd: path.resolve(path.join(repoPath, '..'))
        };

        async.waterfall([
            function (next) {
                let command = ['mkdir', repoPath];
                exec(command.join(' '), options, err => next(err));
            },
            function (next) {
                let command = ['touch', path.join(repoPath, '.git')];
                exec(command.join(' '), options, err => next(err));
            },
            function (next) {
                gitRepo.init(true, function (err) {
                    assert.ok(err);
                    assert.equal('EFAILED', err.code);
                    assert.equal('Wrong repository format', err.message);
                    next();
                });
            },
        ], done)
    });

    it('Should get current branch', function (done) {
        this.timeout(10000);
        let gitRepo = new GitRepo(repoPath, repository);

        async.waterfall([
            function (next) {
                gitRepo.init(true, next);
            },
            function (next) {
                assert.equal('master', gitRepo.branch);
                next();
            }
        ], done)
    });

    describe('Repository methods', function () {
        let gitRepo;
        let execOptions;

        this.timeout(10000);

        beforeEach(function (done) {
            execOptions = {
                cwd: repoPath
            };

            gitRepo = new GitRepo(repoPath, repository);
            gitRepo.init(true, done);
        });

        it('Should change branch', function (done) {

            async.series([
                function (next) {
                    checkBranchChange('develop', next);
                },
                function (next) {
                    checkBranchChange('master', next);
                }
            ], done)

            function checkBranchChange(branchName, callback) {
                async.waterfall([
                    function (next) {
                        gitRepo.setBranch(branchName, next);
                    },
                    function (next) {
                        exec('git branch', execOptions, (err, output) => next(err, output));
                    },
                    function (output, next) {
                        let regexString = '^\\*\\s' + branchName + '$'
                        let regex = new RegExp(regexString, 'm');
                        assert.ok(regex.test(output));
                        assert.equal(branchName, gitRepo.branch);
                        next();
                    }
                ], callback);
            }
        });

        it('Should error to change to non existent branch', function (done) {
            gitRepo.setBranch('nonExistent', function (err) {
                assert.ok(err);
                done();
            });
        });

        it('Should pull local repository', function (done) {
            async.waterfall([
                function (next) {
                    gitRepo.pull(next);
                },
                function (output, next) {
                    assert.ok(_.includes(output, 'Already up-to-date.'))
                    next();
                }
            ], done)
        })

        it('Should pull remote repository', function (done) {
            this.timeout('10000');
            async.waterfall([
                function (next) {
                    gitRepo.pull(repository, next);
                },
                function (output, next) {
                    assert.ok(_.includes(output, 'Already up-to-date.'))
                    next();
                }
            ], done)
        });
    });

    describe('Log error and output', function () {

        it('log data', function (done) {
            let logger = new Logger();
            let gitRepo = new GitRepo(repoPath, repository, logger);

            async.waterfall([
                function (next) {
                    gitRepo.init(true, next);
                },
                function (next) {
                    assert.notEqual('', logger.logOutput);
                    next();
                }
            ], done)
        });

        it('log error', function (done) {
            let logger = new Logger();
            let gitRepo = new GitRepo(repoPath, repository, logger);

            async.waterfall([
                function (next) {
                    gitRepo.init(true, next);
                },
                function next(next) {
                    gitRepo.setBranch('nonExistent', function (err) {
                        assert.ok(err);
                        next();
                    });
                },
                function (next) {
                    assert.notEqual('', logger.errOutput);
                    next();
                }
            ], done)
        });

    });
});