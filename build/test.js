"use strict";
const server_1 = require("./server");
const clan_fp_1 = require("clan-fp");
const log = (...a) => console.log(...a);
const benchmark = message => context => {
    let before = +new Date;
    context.res.on('finish', () => {
        let after = +new Date;
        console.log(message ? message + ':' : '', after - before + 'ms');
    });
    return context;
};
const start = clan_fp_1.obs();
start
    .map(benchmark())
    .map(server_1.send)
    .map(server_1.cookie)
    .map(server_1.gzip)
    .maybe(server_1.serve('src'))[0]
    .map(server_1.get('/', ctx => {
    try {
        ctx.send('hello world');
    }
    catch (e) {
        log(e);
    }
}))
    .map(server_1.get('/api', c => c.send('api page ' + Math.random())))
    .map(server_1.get('/notes', c => c.send(`main notes page`)))
    .map(server_1.get('/notes/{id}', c => c.send(`notes page - ${c.params[0]}`)))
    .map(server_1.get('/github/{username}', async (c) => {
    await new Promise(res => setTimeout(() => res(), 1500));
    c.send('some test JSON'.split(' '));
}))
    .map(server_1.get('.*', c => c.send(404)));
server_1.server(start);
//# sourceMappingURL=test.js.map