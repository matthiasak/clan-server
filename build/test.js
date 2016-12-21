module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmory exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		Object.defineProperty(exports, name, {
/******/ 			configurable: false,
/******/ 			enumerable: true,
/******/ 			get: getter
/******/ 		});
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 10);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/server.js":
/***/ function(module, exports, __webpack_require__) {

"use strict";
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

const zlib = __webpack_require__(8),
      fs = __webpack_require__(3),
      qs = __webpack_require__(6),
      stream = __webpack_require__(7),
      Buffer = __webpack_require__(1).Buffer,
      { model, hamt, obs, worker, cof, cob, curry, batch, c, concatter, filtering, mapping, pf, rAF, vdom } = __webpack_require__(0);

const log = (...a) => console.log(...a);

if (false) {
	module.hot.accept();
}

// cookie middleware
const cookie = context => {
	const c = (key = undefined, val = undefined) => {
		let { headers = {} } = context.req,
		    { cookie = '' } = headers,
		    ck = cookie.split(';').map(c => c.trim()).filter(c => c.length !== 0).reduce((acc, c) => {
			let [key, val] = c.split('=').map(c => c.trim());
			acc[key] = val;
			return acc;
		}, {});

		if (key !== undefined) {
			if (val === undefined) delete ck[key];else ck[key] = val;

			context.res.setHeader('Set-Cookie', Object.keys(ck).map(k => `${ k }=${ ck[k] }`));
		}
		return ck;
	},
	      clearCookie = () => context.res.setHeader('Set-Cookie', '');

	return _extends({}, context, { cookie: c, clearCookie });
};
/* harmony export (immutable) */ exports["cookie"] = cookie;


// send middleware (adds send method to context)
const send = context => {
	const s = (data, code = 200) => {
		const { req, res } = context;

		if (data instanceof Number || typeof data === 'number') {
			res.statusCode = data;
			return res.end();
		} else {
			res.statusCode = code;
		}

		if (!(data instanceof Buffer)) {
			if (data instanceof Object) {
				data = JSON.stringify(data);
			} else {
				data = data.toString();
			}
		}

		res.end(data);
	};
	return _extends({}, context, { send: s });
};
/* harmony export (immutable) */ exports["send"] = send;


// send file middleware (adds sendFIle middleware to context)
const sendFile = context => {
	const s = file => {
		const { req, res } = context;
		res.statusCode = 200;
		file instanceof Buffer ? Buffer.from(file).pipe(res) : fs.createReadStream(file).pipe(res);
	};

	return _extends({}, context, { sendFile: s });
};
/* harmony export (immutable) */ exports["sendFile"] = sendFile;


// compression middleware (modifies context with a new send method)
const gzip = context => {
	const { req, res, send } = context,
	      e = req.headers['accept-encoding'] || '',
	      encode = data => {
		data = (data instanceof String || typeof data === 'string') && data || (data instanceof Number || typeof data === 'number') && data + '' || (data instanceof Boolean || typeof data === 'boolean') && data + '' || data instanceof Object && JSON.stringify(data) || data + '';

		if (e.match(/gzip/)) {
			res.setHeader('content-encoding', 'gzip');
			return zlib.gzipSync(data);
		} else if (e.match(/deflate/)) {
			res.setHeader('content-encoding', 'deflate');
			return zlib.deflateSync(data);
		}

		return data;
	},
	      zip = (data, ...args) => send(encode(data), ...args);

	return _extends({}, context, { send: zip });
};
/* harmony export (immutable) */ exports["gzip"] = gzip;


// routing middleware
const route = type => (url, action) => context => {
	if (context.__handled || context.res.headersSent || context.req.method.toLowerCase() !== type) return;

	const { req, res } = context,
	      reggie = url.replace(/\/\{((\w*)(\??))\}/ig, '\/?(\\w+$3)'),
	      r = RegExp(`^${ reggie }$`),
	      i = req.url.indexOf('?'),
	      v = r.exec(i === -1 ? req.url : req.url.slice(0, i));

	if (!!v) {
		context.__handled = true;

		const params = v.slice(1),
		      query = qs.parse(req.url.slice(i + 1));

		action(_extends({}, context, { params, query }));
	}

	return context;
};
/* harmony export (immutable) */ exports["route"] = route;

const get = route('get');
/* harmony export (immutable) */ exports["get"] = get;

const put = route('put');
/* harmony export (immutable) */ exports["put"] = put;

const post = route('post');
/* harmony export (immutable) */ exports["post"] = post;

const del = route('delete');
/* harmony export (immutable) */ exports["del"] = del;

const patch = route('patch');
/* harmony export (immutable) */ exports["patch"] = patch;


// static file serving async-middleware
const serve = (folder = './', route = '/') => context => {
	const { req, res } = context,
	      { url } = req,
	      filepath = `${ process.cwd() }/${ folder }/${ url.slice(1).replace(new RegExp(`/^${ route }/`, `ig`), '') }`.replace(/\/\//ig, '/');

	return new Promise((y, n) => fs.stat(filepath, (err, stats) => {
		if (!err && stats.isFile()) {
			fs.createReadStream(filepath).pipe(res);
			return n(context);
		}

		y(context);
	}));
};
/* harmony export (immutable) */ exports["serve"] = serve;


const server = (pipe, port = 3000, useCluster = false) => {
	const http = __webpack_require__(4);

	if (!useCluster) return http.createServer((req, res) => pipe({ req, res })).listen(port, err => err && console.error(err) || console.log(`Server running at :${ port } on process ${ process.pid }`));

	const cluster = __webpack_require__(2),
	      numCPUs = __webpack_require__(5).cpus().length;

	if (cluster.isMaster) {
		for (var i = 0; i < numCPUs; i++) cluster.fork();
		cluster.on('exit', (worker, code, signal) => console.log(`worker ${ worker.process.pid } died`));
	} else {
		const s = http.createServer((req, res) => pipe({ req, res }));
		s.listen(port, err => err && console.error(err) || console.log(`Server running at :${ port } on process ${ process.pid }`));
	}
};
/* harmony export (immutable) */ exports["server"] = server;


/***/ },

/***/ "./src/test.js":
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__server__ = __webpack_require__("./src/server.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_clan_fp__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_clan_fp___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_clan_fp__);
function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then((function (value) { step("next", value); }), (function (err) { step("throw", err); })); } } return step("next"); }); }; }




if (false) {
	module.hot.accept();
}

const log = (...a) => console.log(...a);

const benchmark = message => context => {
	let before = +new Date();
	context.res.on('finish', () => {
		let after = +new Date();
		console.log(message ? message + ':' : '', after - before + 'ms');
	});
	return context;
};

// observables have methods: map, reduce, filter, then, maybe, union, from, take, takeWhile, debounce, stop

const start = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_clan_fp__["obs"])();

start.map(benchmark()).map(__WEBPACK_IMPORTED_MODULE_0__server__["send"]).map(__WEBPACK_IMPORTED_MODULE_0__server__["cookie"]).map(__WEBPACK_IMPORTED_MODULE_0__server__["gzip"]).maybe(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__server__["serve"])('src'))[0].map(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__server__["get"])('/', ctx => {
	try {
		ctx.send('hello world');
	} catch (e) {
		log(e);
	}
})).map(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__server__["get"])('/api', c => c.send('api page ' + Math.random()))).map(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__server__["get"])('/notes', c => c.send(`main notes page`))).map(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__server__["get"])('/notes/{id}', c => c.send(`notes page - ${ c.params[0] }`))).map(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__server__["get"])('/github/{username}', (() => {
	var _ref = _asyncToGenerator((function* (c) {
		yield new Promise(function (res) {
			return setTimeout((function () {
				return res();
			}), 1500);
		});
		c.send('some test JSON'.split(' '));
	}));

	return function (_x) {
		return _ref.apply(this, arguments);
	};
})())).map(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__server__["get"])('.*', c => c.send(404)));

__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__server__["server"])(start);

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

/***/ },

/***/ 0:
/***/ function(module, exports) {

module.exports = require("clan-fp");

/***/ },

/***/ 1:
/***/ function(module, exports) {

module.exports = require("buffer");

/***/ },

/***/ 10:
/***/ function(module, exports, __webpack_require__) {

module.exports = __webpack_require__("./src/test.js");


/***/ },

/***/ 2:
/***/ function(module, exports) {

module.exports = require("cluster");

/***/ },

/***/ 3:
/***/ function(module, exports) {

module.exports = require("fs");

/***/ },

/***/ 4:
/***/ function(module, exports) {

module.exports = require("http");

/***/ },

/***/ 5:
/***/ function(module, exports) {

module.exports = require("os");

/***/ },

/***/ 6:
/***/ function(module, exports) {

module.exports = require("querystring");

/***/ },

/***/ 7:
/***/ function(module, exports) {

module.exports = require("stream");

/***/ },

/***/ 8:
/***/ function(module, exports) {

module.exports = require("zlib");

/***/ }

/******/ });