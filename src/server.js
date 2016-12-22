const zlib = require('zlib')
	, fs = require('fs')
	, qs = require('querystring')
	, stream = require('stream')
	, Buffer = require('buffer').Buffer
	, { model, hamt, obs, worker, cof, cob, curry, batch, c, concatter, filtering, mapping, pf, rAF, vdom } = require('clan-fp')

const log = (...a) => console.log(...a)

// cookie middleware
export const cookie = context => {
	const c = (key=undefined, val=undefined) => {
			let {headers={}} = context.req
				, {cookie=''} = headers
				, ck = cookie
					.split(';')
					.map(c => c.trim())
					.filter(c => c.length !== 0)
					.reduce((acc, c) => {
						let [key,val] = c.split('=').map(c => c.trim())
						acc[key] = val
						return acc
					}, {})

			if(key !== undefined) {
				if(val === undefined) delete ck[key]
				else ck[key] = val

				context.res.setHeader('Set-Cookie', Object.keys(ck).map(k => `${k}=${ck[k]}`))
			}
			return ck
		}
		, clearCookie = () => context.res.setHeader('Set-Cookie', '')

	return {...context, cookie: c, clearCookie}
}

// send middleware (adds send method to context)
export const send = context => {
	const s = (data, code=200) => {
		const {req, res} = context

		if(data instanceof Number || typeof data === 'number') {
			res.statusCode = data
			return res.end('')
		} else {
			res.statusCode = code
		}

		if(!(data instanceof Buffer)){
			if(data instanceof Object) {
				data = JSON.stringify(data)
			} else {
				data = data.toString()
			}
		}

		res.end(data || '')
	}
	return {...context, send: s}
}

// send file middleware (adds sendFile method to context)
export const sendFile = context => {
	const s = file => {
		const {req, res} = context
		res.statusCode = 200
		addMIME(file, res)
		file instanceof Buffer
			? Buffer.from(file).pipe(res)
			: fs.createReadStream(file).pipe(res)
	}

	return {...context, sendFile: s}
}

// benchmark handler
export const benchmark = message => context => {
	let before = +new Date
	context.res.on('finish', () => {
		let after = +new Date
		console.log(req.url + ' --- ' + (message ? message+':' : '', after-before+'ms'))
	})
	return context
}

// parse data streams from req body
export const body = (ctx) => {
	ctx.body = new Promise((res,rej) => {
		let {req} = ctx
		let buf = ''
		req.setEncoding('utf8')
		req.on('data', c => buf += c)
		req.on('end', _ => {
			ctx.body = () => Promise.Resolve(buf)
			res(buf)
		})
	})
	return ctx
}

// compression middleware (modifies context with a new send method)
export const gzip = context => {
	const { req, res, send } = context
		, e = req.headers['accept-encoding'] || ''
		, encode = (data) => {
			data =
				(data instanceof String || typeof data === 'string') && data
				|| (data instanceof Number || typeof data === 'number') && data+''
				|| (data instanceof Boolean || typeof data === 'boolean') && data+''
				|| data instanceof Object && JSON.stringify(data)
				|| data+''

			if(e.match(/gzip/)) {
				res.setHeader('content-encoding', 'gzip')
				return zlib.gzipSync(data)
			} else if(e.match(/deflate/)) {
				res.setHeader('content-encoding', 'deflate')
				return zlib.deflateSync(data)
			}

			return data
		}
		, zip = (data, ...args) => send(encode(data), ...args)

	return {...context, send: zip}
}

// routing middleware
export const route = type => (url, action) => context => {
	if(context.__handled || context.res.headersSent || context.req.method.toLowerCase() !== type) return

	const {req, res} = context
		, reggie = url.replace(/\/\{((\w*)(\??))\}/ig, '\/?(\\w+$3)')
		, r = RegExp(`^${reggie}$`)
		, i = req.url.indexOf('?')
		, v = r.exec(i === -1 ? req.url : req.url.slice(0,i))

	if(!!v) {
		context.__handled = true

		const params = v.slice(1)
			, query = qs.parse(req.url.slice(i+1))

		action({...context, params, query})
	}

	return context
}
export const get = route('get')
export const put = route('put')
export const post = route('post')
export const del = route('delete')
export const patch = route('patch')

// static file serving async-middleware
export const serve = (folder='./', route='/') => context => {
	const {req, res} = context
		, {url} = req
		, filepath = `${process.cwd()}/${folder}/${url.slice(1).replace(new RegExp(`/^${route}/`,`ig`), '')}`.replace(/\/\//ig, '/')

	return new Promise((y, n) =>
		fs.stat(filepath, (err, stats) => {
			if(!err && stats.isFile()){
				addMIME(url, res)
				fs.createReadStream(filepath).pipe(res)
				return n(context)
			}
			y(context)
		}))
}

const addMIME = (url, res, type) => {
		url.match(/\.js$/) && res.setHeader('Content-Type', 'text/javascript')
		url.match(/\.json$/) && res.setHeader('Content-Type', 'application/json')
		url.match(/\.pdf$/) && res.setHeader('Content-Type', 'application/pdf')
		url.match(/\.html$/) && res.setHeader('Content-Type', 'text/html')
		url.match(/\.css$/) && res.setHeader('Content-Type', 'text/css')

		url.match(/\.jpe?g$/) && res.setHeader('Content-Type', 'image/jpeg')
		url.match(/\.png$/) && res.setHeader('Content-Type', 'image/png')
		url.match(/\.gif$/) && res.setHeader('Content-Type', 'image/gif')
}

export const server = (pipe, port=3000, useCluster=false) => {
	const http = require('http')

	if(!useCluster)
		return http
			.createServer((req, res) => pipe({req, res}))
			.listen(port, (err) =>
			err
				&& console.error(err)
				|| console.log(`Server running at :${port} on process ${process.pid}`))

	const cluster = require('cluster')
		, numCPUs = require('os').cpus().length

	if (cluster.isMaster) {
		for (var i = 0; i < numCPUs; i++) cluster.fork()
		cluster.on('exit', (worker, code, signal) =>
			console.log(`worker ${worker.process.pid} died`))
	} else {
		const s = http.createServer((req, res) => pipe({req, res}))
		s.listen(port, (err) =>
			err
				&& console.error(err)
				|| console.log(`Server running at :${port} on process ${process.pid}`))
	}
}

export const http = server