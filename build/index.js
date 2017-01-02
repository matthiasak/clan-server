(function(FuseBox){
FuseBox.pkg("clan-server", {}, function(___scope___){
___scope___.file("index.js", function(exports, require, module, __filename, __dirname){ 
var process = require("process");
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var zlib = require('zlib'),
    fs = require('fs'),
    qs = require('querystring'),
    stream = require('stream'),
    Buffer = require('buffer').Buffer,
    _require = require('clan-fp'),
    model = _require.model,
    hamt = _require.hamt,
    obs = _require.obs,
    worker = _require.worker,
    cof = _require.cof,
    cob = _require.cob,
    curry = _require.curry,
    batch = _require.batch,
    c = _require.c,
    concatter = _require.concatter,
    filtering = _require.filtering,
    mapping = _require.mapping,
    pf = _require.pf,
    rAF = _require.rAF,
    vdom = _require.vdom;


var log = function log() {
	var _console;

	return (_console = console).log.apply(_console, arguments);
};

// cookie middleware
var cookie = exports.cookie = function cookie(context) {
	var c = function c() {
		var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
		var val = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
		var _context$req$headers = context.req.headers,
		    headers = _context$req$headers === undefined ? {} : _context$req$headers,
		    _headers$cookie = headers.cookie,
		    cookie = _headers$cookie === undefined ? '' : _headers$cookie,
		    ck = cookie.split(';').map(function (c) {
			return c.trim();
		}).filter(function (c) {
			return c.length !== 0;
		}).reduce(function (acc, c) {
			var _c$split$map = c.split('=').map(function (c) {
				return c.trim();
			}),
			    _c$split$map2 = _slicedToArray(_c$split$map, 2),
			    key = _c$split$map2[0],
			    val = _c$split$map2[1];

			acc[key] = val;
			return acc;
		}, {});


		if (key !== undefined) {
			if (val === undefined) delete ck[key];else ck[key] = val;

			context.res.setHeader('Set-Cookie', Object.keys(ck).map(function (k) {
				return k + '=' + ck[k];
			}));
		}
		return ck;
	},
	    clearCookie = function clearCookie() {
		return context.res.setHeader('Set-Cookie', '');
	};

	return Object.assign({}, context, { cookie: c, clearCookie: clearCookie });
};

// send gzipped file
var sendFile = exports.sendFile = function sendFile(context) {
	var s = function s(file) {
		var req = context.req,
		    res = context.res;

		res.statusCode = 200;
		addMIME(file, res);
		file instanceof Buffer ? streamable(file).pipe(zlib.createGzip()).pipe(res) : fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
	};

	return Object.assign({}, context, { sendFile: s });
};

// benchmark handler
var benchmark = exports.benchmark = function benchmark(message) {
	return function (context) {
		var before = +new Date();
		context.res.on('finish', function () {
			var after = +new Date();
			console.log(req.url + ' --- ' + (message ? message + ':' : '', after - before + 'ms'));
		});
		return context;
	};
};

// parse data streams from req body
var body = exports.body = function body(ctx) {
	ctx.body = new Promise(function (res, rej) {
		var req = ctx.req;

		var buf = '';
		req.setEncoding('utf8');
		req.on('data', function (c) {
			return buf += c;
		});
		req.on('end', function (_) {
			ctx.body = function () {
				return Promise.Resolve(buf);
			};
			res(buf);
		});
	});
	return ctx;
};

var streamable = function streamable(buf) {
	var i = 0,
	    s = buf.toString(),
	    x = new stream.Readable({
		read: function read(size) {
			if (i < s.length) {
				this.push(s.slice(i, i + size));
				i = i + size;
			} else {
				this.push(null);
			}
		}
	});
	return x;
};

// send gzipped response middleware
var send = exports.send = function send(context) {
	var req = context.req,
	    res = context.res,
	    e = req.headers['accept-encoding'] || '',
	    s = function s(buffer) {
		var code = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 200;

		if (typeof buffer === 'number') {
			res.statusCode = buffer;
			return res.end('');
		} else {
			res.statusCode = code;
		}

		if (!(buffer instanceof Buffer)) buffer = Buffer.from((typeof buffer === 'undefined' ? 'undefined' : _typeof(buffer)) === 'object' ? JSON.stringify(buffer) : buffer);

		buffer = streamable(buffer);

		if (e.match(/gzip/)) {
			res.setHeader('content-encoding', 'gzip');
			buffer.pipe(zlib.createGzip()).pipe(res);
		} else if (e.match(/deflate/)) {
			res.setHeader('content-encoding', 'deflate');
			buffer.pipe(zlib.createDeflate()).pipe(res);
		} else {
			buffer.pipe(res);
		}
	};

	return Object.assign({}, context, { send: s });
};

// routing middleware
var route = exports.route = function route(type) {
	return function (url, action) {
		return function (context) {
			if (context.__handled || context.res.headersSent || context.req.method.toLowerCase() !== type) return;

			var req = context.req,
			    res = context.res,
			    reggie = url.replace(/\/\{((\w*)(\??))\}/ig, '\/?(\\w+$3)'),
			    r = RegExp('^' + reggie + '$'),
			    i = req.url.indexOf('?'),
			    v = r.exec(i === -1 ? req.url : req.url.slice(0, i));


			if (!!v) {
				context.__handled = true;

				var params = v.slice(1),
				    query = qs.parse(req.url.slice(i + 1));

				action(Object.assign({}, context, { params: params, query: query }));
			}

			return context;
		};
	};
};
var get = exports.get = route('get');
var put = exports.put = route('put');
var post = exports.post = route('post');
var del = exports.del = route('delete');
var patch = exports.patch = route('patch');

// static file serving async-middleware
var serve = exports.serve = function serve() {
	var folder = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : './';
	var route = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '/';
	return function (context) {
		var req = context.req,
		    res = context.res,
		    url = req.url,
		    filepath = (process.cwd() + '/' + folder + '/' + url.slice(1).replace(new RegExp('/^' + route + '/', 'ig'), '')).replace(/\/\//ig, '/'),
		    e = req.headers['accept-encoding'] || '';


		return new Promise(function (y, n) {
			return fs.stat(filepath, function (err, stats) {
				if (!err && stats.isFile()) {
					addMIME(url, res);

					if (e.match(/gzip/)) {
						res.setHeader('content-encoding', 'gzip');
						fs.createReadStream(filepath).pipe(zlib.createGzip()).pipe(res);
					} else if (e.match(/deflate/)) {
						res.setHeader('content-encoding', 'deflate');
						fs.createReadStream(filepath).pipe(zlib.createDeflate()).pipe(res);
					} else {
						fs.createReadStream(filepath).pipe(res);
					}

					n(context);
				} else {
					y(context);
				}
			});
		});
	};
};

var addMIME = function addMIME(url, res, type) {
	url.match(/\.js$/) && res.setHeader('Content-Type', 'text/javascript');
	url.match(/\.json$/) && res.setHeader('Content-Type', 'application/json');
	url.match(/\.pdf$/) && res.setHeader('Content-Type', 'application/pdf');
	url.match(/\.html$/) && res.setHeader('Content-Type', 'text/html');
	url.match(/\.css$/) && res.setHeader('Content-Type', 'text/css');

	url.match(/\.jpe?g$/) && res.setHeader('Content-Type', 'image/jpeg');
	url.match(/\.png$/) && res.setHeader('Content-Type', 'image/png');
	url.match(/\.gif$/) && res.setHeader('Content-Type', 'image/gif');
};

var server = exports.server = function server(pipe) {
	var port = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3000;
	var useCluster = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	var http = require('http');

	if (!useCluster) return http.createServer(function (req, res) {
		return pipe({ req: req, res: res });
	}).listen(port, function (err) {
		return err && console.error(err) || console.log('Server running at :' + port + ' on process ' + process.pid);
	});

	var cluster = require('cluster'),
	    numCPUs = require('os').cpus().length;

	if (cluster.isMaster) {
		for (var i = 0; i < numCPUs; i++) {
			cluster.fork();
		}cluster.on('exit', function (worker, code, signal) {
			return console.log('worker ' + worker.process.pid + ' died');
		});
	} else {
		var s = http.createServer(function (req, res) {
			return pipe({ req: req, res: res });
		});
		s.listen(port, function (err) {
			return err && console.error(err) || console.log('Server running at :' + port + ' on process ' + process.pid);
		});
	}
};

var http = exports.http = server;
});
___scope___.file("test.js", function(exports, require, module, __filename, __dirname){ 
var process = require("process");
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _server = require('./server');

var _clanFp = require('clan-fp');

Function.prototype.$asyncbind = function $asyncbind(self, catcher) {
	"use strict";

	if (!Function.prototype.$asyncbind) {
		Object.defineProperty(Function.prototype, "$asyncbind", {
			value: $asyncbind,
			enumerable: false,
			configurable: true,
			writable: true
		});
	}

	if (!$asyncbind.trampoline) {
		$asyncbind.trampoline = function trampoline(t, x, s, e, u) {
			return function b(q) {
				while (q) {
					if (q.then) {
						q = q.then(b, e);
						return u ? undefined : q;
					}

					try {
						if (q.pop) {
							if (q.length) return q.pop() ? x.call(t) : q;
							q = s;
						} else q = q.call(t);
					} catch (r) {
						return e(r);
					}
				}
			};
		};
	}

	if (!$asyncbind.LazyThenable) {
		$asyncbind.LazyThenable = function () {
			function isThenable(obj) {
				return obj && obj instanceof Object && typeof obj.then === "function";
			}

			function resolution(p, r, how) {
				try {
					var x = how ? how(r) : r;
					if (p === x) return p.reject(new TypeError("Promise resolution loop"));

					if (isThenable(x)) {
						x.then(function (y) {
							resolution(p, y);
						}, function (e) {
							p.reject(e);
						});
					} else {
						p.resolve(x);
					}
				} catch (ex) {
					p.reject(ex);
				}
			}

			function Chained() {}

			;
			Chained.prototype = {
				resolve: _unchained,
				reject: _unchained,
				then: thenChain
			};

			function _unchained(v) {}

			function thenChain(res, rej) {
				this.resolve = res;
				this.reject = rej;
			}

			function then(res, rej) {
				var chain = new Chained();

				try {
					this._resolver(function (value) {
						return isThenable(value) ? value.then(res, rej) : resolution(chain, value, res);
					}, function (ex) {
						resolution(chain, ex, rej);
					});
				} catch (ex) {
					resolution(chain, ex, rej);
				}

				return chain;
			}

			function Thenable(resolver) {
				this._resolver = resolver;
				this.then = then;
			}

			;

			Thenable.resolve = function (v) {
				return Thenable.isThenable(v) ? v : {
					then: function then(resolve) {
						return resolve(v);
					}
				};
			};

			Thenable.isThenable = isThenable;
			return Thenable;
		}();

		$asyncbind.EagerThenable = $asyncbind.Thenable = ($asyncbind.EagerThenableFactory = function (tick) {
			tick = tick || (typeof process === 'undefined' ? 'undefined' : _typeof(process)) === "object" && process.nextTick || typeof setImmediate === "function" && setImmediate || function (f) {
				setTimeout(f, 0);
			};

			var soon = function () {
				var fq = [],
				    fqStart = 0,
				    bufferSize = 1024;

				function callQueue() {
					while (fq.length - fqStart) {
						fq[fqStart]();
						fq[fqStart++] = undefined;

						if (fqStart === bufferSize) {
							fq.splice(0, bufferSize);
							fqStart = 0;
						}
					}
				}

				return function (fn) {
					fq.push(fn);
					if (fq.length - fqStart === 1) tick(callQueue);
				};
			}();

			function Zousan(func) {
				if (func) {
					var me = this;
					func(function (arg) {
						me.resolve(arg);
					}, function (arg) {
						me.reject(arg);
					});
				}
			}

			Zousan.prototype = {
				resolve: function resolve(value) {
					if (this.state !== undefined) return;
					if (value === this) return this.reject(new TypeError("Attempt to resolve promise with self"));
					var me = this;

					if (value && (typeof value === "function" || (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === "object")) {
						try {
							var first = 0;
							var then = value.then;

							if (typeof then === "function") {
								then.call(value, function (ra) {
									if (!first++) {
										me.resolve(ra);
									}
								}, function (rr) {
									if (!first++) {
										me.reject(rr);
									}
								});
								return;
							}
						} catch (e) {
							if (!first) this.reject(e);
							return;
						}
					}

					this.state = STATE_FULFILLED;
					this.v = value;
					if (me.c) soon(function () {
						for (var n = 0, l = me.c.length; n < l; n++) {
							STATE_FULFILLED(me.c[n], value);
						}
					});
				},
				reject: function reject(reason) {
					if (this.state !== undefined) return;
					this.state = STATE_REJECTED;
					this.v = reason;
					var clients = this.c;
					if (clients) soon(function () {
						for (var n = 0, l = clients.length; n < l; n++) {
							STATE_REJECTED(clients[n], reason);
						}
					});
				},
				then: function then(onF, onR) {
					var p = new Zousan();
					var client = {
						y: onF,
						n: onR,
						p: p
					};

					if (this.state === undefined) {
						if (this.c) this.c.push(client);else this.c = [client];
					} else {
						var s = this.state,
						    a = this.v;
						soon(function () {
							s(client, a);
						});
					}

					return p;
				}
			};

			function STATE_FULFILLED(c, arg) {
				if (typeof c.y === "function") {
					try {
						var yret = c.y.call(undefined, arg);
						c.p.resolve(yret);
					} catch (err) {
						c.p.reject(err);
					}
				} else c.p.resolve(arg);
			}

			function STATE_REJECTED(c, reason) {
				if (typeof c.n === "function") {
					try {
						var yret = c.n.call(undefined, reason);
						c.p.resolve(yret);
					} catch (err) {
						c.p.reject(err);
					}
				} else c.p.reject(reason);
			}

			Zousan.resolve = function (val) {
				if (val && val instanceof Zousan) return val;
				var z = new Zousan();
				z.resolve(val);
				return z;
			};

			Zousan.reject = function (err) {
				if (err && err instanceof Zousan) return err;
				var z = new Zousan();
				z.reject(err);
				return z;
			};

			Zousan.version = "2.3.2-nodent";
			return Zousan;
		})();
	}

	var resolver = this;

	switch (catcher) {
		case true:
			return new $asyncbind.Thenable(boundThen);

		case 0:
			return new $asyncbind.LazyThenable(boundThen);

		case undefined:
			boundThen.then = boundThen;
			return boundThen;

		default:
			return function () {
				try {
					return resolver.apply(self, arguments);
				} catch (ex) {
					return catcher(ex);
				}
			};
	}

	function boundThen() {
		return resolver.apply(self, arguments);
	}
};

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

if (module.hot) {
	module.hot.accept();
}

var log = function log() {
	var _console;

	return (_console = console).log.apply(_console, arguments);
};

var benchmark = function benchmark(message) {
	return function (context) {
		var before = +new Date();
		context.res.on('finish', function () {
			var after = +new Date();
			console.log(message ? message + ':' : '', after - before + 'ms');
		});
		return context;
	};
};

// observables have methods: map, reduce, filter, then, maybe, union, from, take, takeWhile, debounce, stop

var start = (0, _clanFp.obs)();

start.map(benchmark()).map(_server.send).map(_server.cookie).map(_server.gzip).maybe((0, _server.serve)('src'))[0].map((0, _server.get)('/', function (ctx) {
	try {
		ctx.send('hello world');
	} catch (e) {
		log(e);
	}
})).map((0, _server.get)('/api', function (c) {
	return c.send('api page ' + Math.random());
})).map((0, _server.get)('/notes', function (c) {
	return c.send('main notes page');
})).map((0, _server.get)('/notes/{id}', function (c) {
	return c.send('notes page - ' + c.params[0]);
})).map((0, _server.get)('/github/{username}', function () {
	var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(c) {
		return regeneratorRuntime.wrap(function _callee$(_context) {
			while (1) {
				switch (_context.prev = _context.next) {
					case 0:
						_context.next = 2;
						return new Promise(function (res) {
							return setTimeout(function () {
								return res();
							}, 1500);
						});

					case 2:
						c.send('some test JSON'.split(' '));

					case 3:
					case 'end':
						return _context.stop();
				}
			}
		}, _callee, undefined);
	}));

	return function (_x) {
		return _ref.apply(this, arguments);
	};
}())).map((0, _server.get)('.*', function (c) {
	return c.send(404);
}));

(0, _server.server)(start);

// you can make middleware, sync or async
// sync

// start.map(context => {
// 	return {...context, name: getRandomName()}
// })

// side-effects (i.e. for analytics)
// start
// 	.then(context => {
// 		sendAnalyticsToCustom()
// 	})
// 	.then(context => {
// 		sendAnalyticsToGoogle()
// 	})

// async (check for login?)
// let [isLoggedIn, isAnonymous] =
// 	start
// 		.maybe(context => newPromise((res, rej) => {
// 			redis.get(context.req.cookie.sesssionId, (err, val) =>
// 				err && rej(context) || res(context))
// 		}))

// 	isLoggedIn
// 		.map(get('/account', ({send}) => send('your account')))

// 	isAnonymous
// 		.then(context => context.res.redirect('/login'))
});
});
FuseBox.expose([{"alias":"clan-server","pkg":"default"}]);

FuseBox.import("clan-server/index.js");
FuseBox.main("clan-server/index.js");
})
(function(e){var r="undefined"!=typeof window&&window.navigator;r&&(window.global=window),e=r&&"undefined"==typeof __fbx__dnm__?e:module.exports;var t=r?window.__fsbx__=window.__fsbx__||{}:global.$fsbx=global.$fsbx||{};r||(global.require=require);var n=t.p=t.p||{},i=t.e=t.e||{},o=function(e){if(/^([@a-z].*)$/.test(e)){if("@"===e[0]){var r=e.split("/"),t=r.splice(2,r.length).join("/");return[r[0]+"/"+r[1],t||void 0]}return e.split(/\/(.+)?/)}},a=function(e){return e.substring(0,e.lastIndexOf("/"))||"./"},f=function(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];for(var t=[],n=0,i=arguments.length;n<i;n++)t=t.concat(arguments[n].split("/"));for(var o=[],n=0,i=t.length;n<i;n++){var a=t[n];a&&"."!==a&&(".."===a?o.pop():o.push(a))}return""===t[0]&&o.unshift(""),o.join("/")||(o.length?"/":".")},u=function(e){var r=e.match(/\.(\w{1,})$/);if(r){var t=r[1];return t?e:e+".js"}return e+".js"},s=function(e){if(r){var t,n=document,i=n.getElementsByTagName("head")[0];/\.css$/.test(e)?(t=n.createElement("link"),t.rel="stylesheet",t.type="text/css",t.href=e):(t=n.createElement("script"),t.type="text/javascript",t.src=e,t.async=!0),i.insertBefore(t,i.firstChild)}},l=function(e,t){var i=t.path||"./",a=t.pkg||"default",s=o(e);s&&(i="./",a=s[0],t.v&&t.v[a]&&(a=a+"@"+t.v[a]),e=s[1]),/^~/.test(e)&&(e=e.slice(2,e.length),i="./");var l=n[a];if(!l){if(r)throw'Package was not found "'+a+'"';return{serverReference:require(a)}}e||(e="./"+l.s.entry);var c,v=f(i,e),p=u(v),d=l.f[p];return!d&&/\*/.test(p)&&(c=p),d||c||(p=f(v,"/","index.js"),d=l.f[p],d||(p=v+".js",d=l.f[p]),d||(d=l.f[v+".jsx"])),{file:d,wildcard:c,pkgName:a,versions:l.v,filePath:v,validPath:p}},c=function(e,t){if(!r)return t(/\.(js|json)$/.test(e)?global.require(e):"");var n;n=new XMLHttpRequest,n.onreadystatechange=function(){if(4==n.readyState&&200==n.status){var r=n.getResponseHeader("Content-Type"),i=n.responseText;/json/.test(r)?i="module.exports = "+i:/javascript/.test(r)||(i="module.exports = "+JSON.stringify(i));var o=f("./",e);d.dynamic(o,i),t(d.import(e,{}))}},n.open("GET",e,!0),n.send()},v=function(e,r){var t=i[e];if(t)for(var n in t){var o=t[n].apply(null,r);if(o===!1)return!1}},p=function(e,t){if(void 0===t&&(t={}),/^(http(s)?:|\/\/)/.test(e))return s(e);var i=l(e,t);if(i.serverReference)return i.serverReference;var o=i.file;if(i.wildcard){var f=new RegExp(i.wildcard.replace(/\*/g,"@").replace(/[.?*+^$[\]\\(){}|-]/g,"\\$&").replace(/@/g,"[a-z0-9$_-]+")),u=n[i.pkgName];if(u){var d={};for(var g in u.f)f.test(g)&&(d[g]=p(i.pkgName+"/"+g));return d}}if(!o){var m="function"==typeof t,_=v("async",[e,t]);if(_===!1)return;return c(e,function(e){if(m)return t(e)})}var h=i.validPath,x=i.pkgName;if(o.locals&&o.locals.module)return o.locals.module.exports;var w=o.locals={},b=a(h);w.exports={},w.module={exports:w.exports},w.require=function(e,r){return p(e,{pkg:x,path:b,v:i.versions})},w.require.main={filename:r?"./":global.require.main.filename};var y=[w.module.exports,w.require,w.module,h,b,x];return v("before-import",y),o.fn.apply(0,y),v("after-import",y),w.module.exports},d=function(){function t(){}return Object.defineProperty(t,"isBrowser",{get:function(){return void 0!==r},enumerable:!0,configurable:!0}),Object.defineProperty(t,"isServer",{get:function(){return!r},enumerable:!0,configurable:!0}),t.global=function(e,t){var n=r?window:global;return void 0===t?n[e]:void(n[e]=t)},t.import=function(e,r){return p(e,r)},t.on=function(e,r){i[e]=i[e]||[],i[e].push(r)},t.exists=function(e){var r=l(e,{});return void 0!==r.file},t.remove=function(e){var r=l(e,{}),t=n[r.pkgName];t&&t.f[r.validPath]&&delete t.f[r.validPath]},t.main=function(e){return t.import(e,{})},t.expose=function(r){for(var t in r){var n=r[t],i=p(n.pkg);e[n.alias]=i}},t.dynamic=function(r,t){this.pkg("default",{},function(n){n.file(r,function(r,n,i,o,a){var f=new Function("__fbx__dnm__","exports","require","module","__filename","__dirname","__root__",t);f(!0,r,n,i,o,a,e)})})},t.pkg=function(e,r,t){if(n[e])return t(n[e].s);var i=n[e]={},o=i.f={};i.v=r;var a=i.s={file:function(e,r){o[e]={fn:r}}};return t(a)},t}();return e.FuseBox=d}(this))
//# sourceMappingURL=index.js.map