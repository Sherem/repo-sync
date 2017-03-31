const restify = require('restify');
const plugins = require('restify-plugins');

const server = restify.createServer();

let env = process.env;

server.use(plugins.bodyParser());

server.post('/repopush', (req, res, next)=> {
    let text = JSON.stringify(req.body, null, 2);

    res.send('Pushed');

    next();
});

server.listen(env.NODE_PORT || 3000, env.NODE_IP || 'localhost', ()=>{
    console.log('%s name listened at %s', server.name, server.url);
})
