var detectSeries = require('async').detectSeries
  , readFile = require('../../src/file').readLocal
  , variants = require('../../src/file').variants
  , pathmod = require('path')
  , join = pathmod.join
  , fs = require('fs')
  , core = pathmod.resolve(__dirname, '../../src/node_modules')+'/'

var node_core = [
	'assert', 'child_process', 'cluster', 'console',
	'constants', 'crypto', 'dgram', 'dns', 'events', 'freelist', 
	'http', 'https', 'module', 'net', 'path', 'querystring', 
	'readline', 'repl', 'stream', 'string_decoder',
	'timers', 'url', 'util'
].reduce(function (acc, x) { acc[x] = true; return acc }, {})

module.exports = [
	function node_modules (dir, name, done) {
		var names = variants(name).map(function (name) {
			return join(dir, 'node_modules', name)
		})
		if (!names[0].match(/\.\w+$/)) names.shift()
		names.push(join(dir, 'node_modules', name, 'package.json'))
		detectSeries(names, fs.exists, function(winner){
			if (winner) {
				readFile(winner).finish(done)
			} 
			else {
				// In node core modules take priority over custom
				// This is doesn't work when building projects with other systems so instead here 
				// built in modules take the lowest priority. They probably should in node too but 
				// note this could cause bugs for some node modules. 
				if (dir === '/' && node_core[name]) {
					readFile(core+name+'.js').finish(done)
				} else {
					done()
				}
			}
		})
	},
	function components (dir, name, done) {
		name = join(dir, 'components', name, 'component.json')
		fs.exists(name, function (bool) {
			if (bool) {
				readFile(name).finish(function (file) {
					done(file)
				})
			} 
			else {
				done()
			}
		})
	}
]
