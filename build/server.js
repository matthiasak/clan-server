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
/******/ 	return __webpack_require__(__webpack_require__.s = 9);
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
      Buffer = __webpack_require__(0).Buffer,
      { model, hamt, obs, worker, cof, cob, curry, batch, c, concatter, filtering, mapping, pf, rAF, vdom } = __webpack_require__(1);

const log = (...a) => console.log(...a);

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
			return res.end('');
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

		res.end(data || '');
	};
	return _extends({}, context, { send: s });
};
/* harmony export (immutable) */ exports["send"] = send;


// send file middleware (adds sendFile method to context)
const sendFile = context => {
	const s = file => {
		const { req, res } = context;
		res.statusCode = 200;
		addMIME(file, res);
		file instanceof Buffer ? Buffer.from(file).pipe(res) : fs.createReadStream(file).pipe(res);
	};

	return _extends({}, context, { sendFile: s });
};
/* harmony export (immutable) */ exports["sendFile"] = sendFile;


// benchmark handler
const benchmark = message => context => {
	let before = +new Date();
	context.res.on('finish', () => {
		let after = +new Date();
		console.log(req.url + ' --- ' + (message ? message + ':' : '', after - before + 'ms'));
	});
	return context;
};
/* harmony export (immutable) */ exports["benchmark"] = benchmark;


// parse data streams from req body
const body = ctx => {
	ctx.body = new Promise((res, rej) => {
		let { req } = ctx;
		let buf = '';
		req.setEncoding('utf8');
		req.on('data', c => buf += c);
		req.on('end', _ => {
			ctx.body = () => Promise.Resolve(buf);
			res(buf);
		});
	});
	return ctx;
};
/* harmony export (immutable) */ exports["body"] = body;


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
			addMIME(url, res);
			fs.createReadStream(filepath).pipe(res);
			return n(context);
		}
		y(context);
	}));
};
/* harmony export (immutable) */ exports["serve"] = serve;


const addMIME = (url, res, type) => {
	url.match(/\.js$/) && res.setHeader('Content-Type', 'text/javascript');
	url.match(/\.json$/) && res.setHeader('Content-Type', 'application/json');
	url.match(/\.pdf$/) && res.setHeader('Content-Type', 'application/pdf');
	url.match(/\.html$/) && res.setHeader('Content-Type', 'text/html');
	url.match(/\.css$/) && res.setHeader('Content-Type', 'text/css');

	url.match(/\.jpe?g$/) && res.setHeader('Content-Type', 'image/jpeg');
	url.match(/\.png$/) && res.setHeader('Content-Type', 'image/png');
	url.match(/\.gif$/) && res.setHeader('Content-Type', 'image/gif');
};

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


const http = server;
/* harmony export (immutable) */ exports["http"] = http;


/***/ },

/***/ 0:
/***/ function(module, exports) {

module.exports = require("buffer");

/***/ },

/***/ 1:
/***/ function(module, exports) {

module.exports = require("clan-fp");

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

/***/ },

/***/ 9:
/***/ function(module, exports, __webpack_require__) {

module.exports = __webpack_require__("./src/server.js");


/***/ }

/******/ });