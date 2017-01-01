const f = require("fuse-box")
	, chokidar = require('chokidar')
	, dev = process.env.NODE_ENV !== 'production'

let rootConfig = {
	homeDir: "src/"
	, cache: dev
	, package: 'clan-server'
	, globals: { 'default': 'clan-server' }
	, plugins: (browser) =>
		[
		f.BabelPlugin({
			// limit2project: false
			// , test: /\.js$/
			config: {
				sourceMaps: true
				, presets:
					(dev ? [] : ['babili'])
					.concat([
						// 'react'
						'latest'
						// , 'stage-0'
					])
				, plugins: [
					"fast-async"
				]
			}
		})
		]
}

let configs = [
	{
		sourceMap: {
			bundleReference: "server.js.map"
			, outFile: "./build/server.js.map"
		}
		, outFile: "./build/server.js"
		, inFile: "[./**/*.js]"
	}
]

const processAll = $ =>
	configs.map(c => {
		let d = Object.assign({}, rootConfig, c)
			, inFile = d.inFile

		d.plugins = d.plugins(d.browser || false)
		delete d.inFile
		delete d.browser

		f.FuseBox.init(d).bundle(inFile)
	})

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