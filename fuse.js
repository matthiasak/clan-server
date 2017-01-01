const f = require("fuse-box")
	, chokidar = require('chokidar')
	, dev = process.env.NODE_ENV !== 'production'

let c = {
	homeDir: "src/"
	, cache: dev
	, package: 'clan-server'
	, globals: { 'default': 'clan-server' }
	, sourceMap: {
		bundleReference: "index.js.map"
		, outFile: "./build/index.js.map"
	}
	, outFile: "./build/index.js"
	, inFile: "[index.js]"
	, plugins: (browser) =>
		[
		f.BabelPlugin({
			config: {
				sourceMaps: true
				, presets:
					(dev ? [] : ['babili'])
					.concat(['latest'])
				, plugins: [
					"fast-async"
				]
			}
		})
		]
}

const processAll = $ => {
	let d = Object.assign({}, c)
		, inFile = d.inFile

	d.plugins = d.plugins(d.browser || false)
	delete d.inFile
	delete d.browser

	f.FuseBox.init(d).bundle(inFile)
}

const debounce = (func, wait, immediate, timeout) =>
	() => {
		let context = this
			, args = arguments
			, later = $ => {
				timeout = null
				!immediate && func.apply(context, args)
			}
			, callNow = immediate && !timeout

		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
		callNow && func.apply(context, args)
	}

let p = debounce(processAll, 250)

dev &&
	chokidar
	.watch('src')
	.on('all', p)

p()