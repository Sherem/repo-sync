const restify = require('restify');
const plugins = require('restify-plugins');

const repoSync = require('./lib/repoSync');

const server = restify.createServer();

let env = process.env;

server.use(plugins.bodyParser());

server.post('/repopush', repoSync.processPush);

server.get(/.*/, plugins.serveStatic({
    directory: 'static',
    default: 'index.html'
}));

server.listen(env.NODE_PORT || 3000, env.NODE_IP || 'localhost', () => {
    console.log('%s name listened at %s', server.name, server.url);
})
