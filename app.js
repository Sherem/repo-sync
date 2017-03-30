const restify = require('restify');
const plugins = require('restify-plugins');

const server = restify.createServer();

server.use(plugins.bodyParser());

server.post('/repopush', (req, res, next)=> {
    let text = JSON.stringify(req.body, null, 2);

    res.send(204);
    console.log(text);

    next();
});

server.listen(8220, ()=>{
    console.log('%s name listened at %s', server.name, server.url);
})