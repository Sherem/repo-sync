const fs = require('fs');
const exec = require('child_process').exec;
const path = require('path');
const assert = require('assert');

const async = require('async');

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

    it.only('Should clone directory for repository', function (done) {
        let gitRepo = new GitRepo(repoPath, repository);

        async.waterfall([
            function (next) {
                gitRepo.init(true, next);
            },
            function (next) {
                var gitPath = path.join(repoPath, '.git');
                fs.stat(repoPath, next);
            },
            function (stat, next) {
                assert.ok(stat.isDirectory());
                next();
            }
        ], done)
    });

});