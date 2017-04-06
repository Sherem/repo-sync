const _ = require('lodash');
const async = require('async');
const fs = require('fs');
const path = require('path');

const GitRepo = require('./gitrepo');

function syncRepository(repoOptions, callback) {
    callback();  // Doing everything offline

    let repo = new GitRepo(repoOptions.dir, repoOptions.url, console);

    async.series([
        function (next) {
            repo.init(true, next);
        },
        function (next) {
            if (repo.branch === repoOptions.branch) {
                return next();
            }

            repo.setBranch(repoOptions.branch, next);
        },
        function (next) {
            repo.pull(repoOptions.sourceUrl, '--ff-only', next);
        },
        function (next) {
            repo.push('origin', next);
        }
    ])
}

function getDatadir(cb) {
    let dataDir = process.env.OPENSHIFT_DATA_DIR || './data';

    checkDir(dataDir, cb);
}

function checkDir(dir, cb) {
    fs.access(dir, fs.constants.R_OK | fs.constants.W_OK, function (err) {
        if (err) {
            return cb(err);
        }
        cb(null, dir);
    });
}

function processPush(req, res, next) {
    let dataDir;

    async.waterfall([
        function (next) {
            getDatadir(next);
        },
        function (dataDirRes, next) {
            dataDir = dataDirRes;
            let cfgFile = path.resolve(dataDir, 'cfg');
            cfg = require(cfgFile);
            cfg.dir = path.resolve(cfg.dir);
            syncRepository(cfg, next);
        }
    ],
        function (err) {
            next.ifError(err);
            res.send(204);
            next();
        });
};

module.exports = {
    processPush: processPush
};