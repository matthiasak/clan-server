# The Clan O'Server

[Clan](https://github.com/matthiasak/clan) is a super succinct, no-dependency set of utilities with a slightly opinionated collection of features that integrate particularly well when used together.

**The Clan O'Server** builds on these small functional compositions to create a super-tiny and agile server. Most everything is built aloft the Observable implementation of `clan-fp`. See the Details below about adding routes, serving files, creating sync and async middleware, and more.

---

[![NPM](https://nodei.co/npm/clan-server.png)](https://nodei.co/npm/clan-server/)
[![Build Status](https://travis-ci.org/matthiasak/clan-server.svg?branch=master)](https://travis-ci.org/matthiasak/clan-server)

## Usage

```sh
yarn add clan-server
# or
npm install --save clan-server
```

## Try It Out!

Here's a nice way to get started:

```sh
mkdir <new project dir>
cd <project dir>
npm init
yarn add clan-server
touch server.js
```

Then checkout [test.js](./src/test.js) for an example of importing and using `clan-server`.

## Caught a bug?

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device
2. Install the dependencies: `yarn`
3. Bundle the source code and watch for changes: `npm start`

After that, you'll find the code in the `./build` folder!

## Authors

- Matthew Keas, [@matthiasak](https://twitter.com/@matthiasak). Need help / support? Create an issue or ping on Twitter.
