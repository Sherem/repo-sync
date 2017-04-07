const _ = require('lodash');
const async = require('async');
const fs = require('fs');
const path = require('path');
const restifyErrors = require('restify').errors;

const GitRepo = require('./gitrepo');
const HookError = require('./hookError');

function syncRepository(repoOptions, callback) {
    callback();  // Doing everything offline
    setImmediate(function () {
        let repo = new GitRepo(repoOptions.dir, repoOptions.sourceUrl, console);

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
                repo.pull('origin', repoOptions.branch, next);
            },
            function (next) {
                repo.push(repoOptions.destUrl, repoOptions.branch, next);
            }
        ])
    });
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

    if (!req.body.payload) {
        next.ifError(new restifyErrors.BadRequestError('No payload field'));
        return next();
    }

    let payload = JSON.parse(req.body.payload);

    async.waterfall([
        function (next) {
            getDatadir(next);
        },
        function (dataDirRes, next) {
            dataDir = dataDirRes;
            let cfgFile = path.resolve(dataDir, 'cfg');
            cfg = require(cfgFile);
            cfg.dir = path.resolve(cfg.dir);

            if (payload.repository.ssh_url !== cfg.sourceUrl) {
                return next(new restifyErrors.BadRequestError('Wrong repository'));
            }

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