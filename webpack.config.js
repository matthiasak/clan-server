let config =
	require("@terse/webpack")
	.api()
    .entry({
    	server: "./src/server.js"
    	// , test: "./src/test.js"
    })
    .loader(
    	'babel'
    	, '.js'
    	, {
        	exclude: /node_modules/
	        , query: { cacheDirectory: true, presets: ['stage-0'] }
	    })
    .plugin("webpack.NamedModulesPlugin")
    .plugin("optimize-js-plugin")
    .plugin("webpack.NoErrorsPlugin")
    .sourcemap("source-map")
    .externals(/^@?\w[a-z\-0-9\./]+$/)
    .output({
		path: './build'
		, library: 'clan-server'
		, libraryTarget: 'commonjs2'
    })
    .target("node")
    .when("development", api =>
    	api
            .entry({
                server: [
                    // "webpack/hot/poll?300"
                    "./src/server.js"
                ]
                // , test: "./src/test.js"
            })
            // .plugin("webpack.HotModuleReplacementPlugin")
            // .plugin('start-server-webpack-plugin', 'test.js')
        )
    .getConfig()

module.exports = config