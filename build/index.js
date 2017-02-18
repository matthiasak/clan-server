"use strict";
var zlib = require('zlib'), fs = require('fs'), qs = require('querystring'), stream = require('stream'), Buffer = require('buffer').Buffer, _a = require('clan-fp'), model = _a.model, hamt = _a.hamt, obs = _a.obs, worker = _a.worker, cof = _a.cof, cob = _a.cob, curry = _a.curry, batch = _a.batch, c = _a.c, concatter = _a.concatter, filtering = _a.filtering, mapping = _a.mapping, pf = _a.pf, rAF = _a.rAF, vdom = _a.vdom;
var log = function () {
    var a = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        a[_i] = arguments[_i];
    }
    return console.log.apply(console, a);
};
// cookie middleware
exports.cookie = function (context) {
    var c = function (key, val) {
        if (key === void 0) { key = undefined; }
        if (val === void 0) { val = undefined; }
        var _a = context.req.headers, headers = _a === void 0 ? {} : _a, _b = headers.cookie, cookie = _b === void 0 ? '' : _b, ck = cookie
            .split(';')
            .map(function (c) { return c.trim(); })
            .filter(function (c) { return c.length !== 0; })
            .reduce(function (acc, c) {
            var _a = c.split('=').map(function (c) { return c.trim(); }), key = _a[0], val = _a[1];
            acc[key] = val;
            return acc;
        }, {});
        if (key !== undefined) {
            if (val === undefined)
                delete ck[key];
            else
                ck[key] = val;
            context.res.setHeader('Set-Cookie', Object.keys(ck).map(function (k) { return k + "=" + ck[k]; }));
        }
        return ck;
    }, clearCookie = function () { return context.res.setHeader('Set-Cookie', ''); };
    return Object.assign({}, context, { cookie: c, clearCookie: clearCookie });
};
// send gzipped file
exports.sendFile = function (context) {
    var s = function (file) {
        var req = context.req, res = context.res;
        res.statusCode = 200;
        addMIME(file, res);
        file instanceof Buffer
            ? streamable(file).pipe(zlib.createGzip()).pipe(res)
            : fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
    };
    return Object.assign({}, context, { sendFile: s });
};
// benchmark handler
exports.benchmark = function (message) { return function (context) {
    var before = +new Date;
    context.res.on('finish', function () {
        var after = +new Date;
        console.log(req.url + ' --- ' + (message ? message + ':' : '', after - before + 'ms'));
    });
    return context;
}; };
// parse data streams from req body
exports.body = function (ctx) {
    ctx.body = new Promise(function (res, rej) {
        var req = ctx.req;
        var buf = '';
        req.setEncoding('utf8');
        req.on('data', function (c) { return buf += c; });
        req.on('end', function (_) {
            ctx.body = function () { return Promise.Resolve(buf); };
            res(buf);
        });
    });
    return ctx;
};
var streamable = function (buf) {
    var i = 0, s = buf.toString(), x = new stream.Readable({
        read: function (size) {
            if (i < s.length) {
                this.push(s.slice(i, i + size));
                i = i + size;
            }
            else {
                this.push(null);
            }
        }
    });
    return x;
};
// send gzipped response middleware
exports.send = function (context) {
    var req = context.req, res = context.res, e = req.headers['accept-encoding'] || '', s = function (buffer, code) {
        if (code === void 0) { code = 200; }
        if (typeof buffer === 'number') {
            res.statusCode = buffer;
            return res.end('');
        }
        else {
            res.statusCode = code;
        }
        if (!(buffer instanceof Buffer))
            buffer = Buffer.from(typeof buffer === 'object' ? JSON.stringify(buffer) : buffer);
        buffer = streamable(buffer);
        if (e.match(/gzip/)) {
            res.setHeader('content-encoding', 'gzip');
            buffer.pipe(zlib.createGzip()).pipe(res);
        }
        else if (e.match(/deflate/)) {
            res.setHeader('content-encoding', 'deflate');
            buffer.pipe(zlib.createDeflate()).pipe(res);
        }
        else {
            buffer.pipe(res);
        }
    };
    return Object.assign({}, context, { send: s });
};
// routing middleware
exports.route = function (type) { return function (url, action) { return function (context) {
    if (context.__handled || context.res.headersSent || context.req.method.toLowerCase() !== type)
        return;
    var req = context.req, res = context.res, reggie = url.replace(/\/\{((\w*)(\??))\}/ig, '\/?(\\w+$3)'), r = RegExp("^" + reggie + "$"), i = req.url.indexOf('?'), v = r.exec(i === -1 ? req.url : req.url.slice(0, i));
    if (!!v) {
        context.__handled = true;
        var params = v.slice(1), query = qs.parse(req.url.slice(i + 1));
        action(Object.assign({}, context, { params: params, query: query }));
    }
    return context;
}; }; };
exports.get = exports.route('get');
exports.put = exports.route('put');
exports.post = exports.route('post');
exports.del = exports.route('delete');
exports.patch = exports.route('patch');
// static file serving async-middleware
exports.serve = function (folder, route) {
    if (folder === void 0) { folder = './'; }
    if (route === void 0) { route = '/'; }
    return function (context) {
        var req = context.req, res = context.res, url = req.url, q = url.indexOf('?'), hash = url.indexOf('#'), _url = url.slice(0, q !== -1 ? q : (hash !== -1 ? hash : undefined)), filepath = (process.cwd() + "/" + folder + "/" + _url.slice(1).replace(new RegExp("/^" + route + "/", "ig"), '')).replace(/\/\//ig, '/'), e = req.headers['accept-encoding'] || '';
        return new Promise(function (y, n) {
            return fs.stat(filepath, function (err, stats) {
                if (!err && stats.isFile()) {
                    addMIME(_url, res);
                    if (e.match(/gzip/)) {
                        res.setHeader('content-encoding', 'gzip');
                        fs.createReadStream(filepath).pipe(zlib.createGzip()).pipe(res);
                    }
                    else if (e.match(/deflate/)) {
                        res.setHeader('content-encoding', 'deflate');
                        fs.createReadStream(filepath).pipe(zlib.createDeflate()).pipe(res);
                    }
                    else {
                        fs.createReadStream(filepath).pipe(res);
                    }
                    n(context);
                }
                else {
                    y(context);
                }
            });
        });
    };
};
var addMIME = function (url, res, type) {
    var c = 'Content-Type';
    url.match(/\.js$/) && res.setHeader(c, 'text/javascript');
    url.match(/\.json$/) && res.setHeader(c, 'application/json');
    url.match(/\.pdf$/) && res.setHeader(c, 'application/pdf');
    url.match(/\.html$/) && res.setHeader(c, 'text/html');
    url.match(/\.css$/) && res.setHeader(c, 'text/css');
    url.match(/\.jpe?g$/) && res.setHeader(c, 'image/jpeg');
    url.match(/\.png$/) && res.setHeader(c, 'image/png');
    url.match(/\.gif$/) && res.setHeader(c, 'image/gif');
    url.match(/\.svg$/) && res.setHeader(c, 'image/svg+xml');
};
exports.server = function (pipe, port, useCluster) {
    if (port === void 0) { port = 3000; }
    if (useCluster === void 0) { useCluster = false; }
    var http = require('http');
    if (!useCluster)
        return http
            .createServer(function (req, res) { return pipe({ req: req, res: res }); })
            .listen(port, function (err) {
            return err
                && console.error(err)
                || console.log("Server running at :" + port + " on process " + process.pid);
        });
    var cluster = require('cluster'), numCPUs = require('os').cpus().length;
    if (cluster.isMaster) {
        for (var i = 0; i < numCPUs; i++)
            cluster.fork();
        cluster.on('exit', function (worker, code, signal) {
            return console.log("worker " + worker.process.pid + " died");
        });
    }
    else {
        var s = http.createServer(function (req, res) { return pipe({ req: req, res: res }); });
        s.listen(port, function (err) {
            return err
                && console.error(err)
                || console.log("Server running at :" + port + " on process " + process.pid);
        });
    }
};
exports.http = exports.server;
