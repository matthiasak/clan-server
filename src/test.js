import {server, cookie, send, sendFile, serve, gzip, route, get, put, post, patch, del} from './server'
import {obs} from 'clan-fp'

if(module.hot){
	module.hot.accept()
}

const log = (...a) => console.log(...a)

const benchmark = message => context => {
	let before = +new Date
	context.res.on('finish', () => {
		let after = +new Date
		console.log(message ? message+':' : '', after-before+'ms')
	})
	return context
}

// observables have methods: map, reduce, filter, then, maybe, union, from, take, takeWhile, debounce, stop

const start = obs()

start
	.map(benchmark())
	.map(send)
	.map(cookie)
	.map(gzip)
	.maybe(serve('src'))[0]
	.map(get('/'
		, ctx => {
			try{
				ctx.send('hello world')
			}catch(e){ log(e) }
		}))
	.map(get('/api', c => c.send('api page '+Math.random())))
	.map(get('/notes', c => c.send(`main notes page`)))
	.map(get('/notes/{id}', c => c.send(`notes page - ${c.params[0]}`)))
	.map(get('/github/{username}', async c => {
		await new Promise(res => setTimeout(() => res(), 1500))
		c.send('some test JSON'.split(' '))
	}))
	.map(get('.*', c => c.send(404)))

server(start)

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