var fs = require('fs')
  , dirname = require('path').dirname
  , Promise = require('laissez-faire')
  , request = require('superagent')
  , doUntil = require('async-loop').doUntil
  , series = require('async-forEach').series
  , debug = require('debug')('getfile')

/**
 * Get a local file using a magic path
 *
 *   getMagic('a/b/c', 'jess', [function(dir, name, done){
 *     fs.readFile(dir+'/node_modules/'+name, function(e, src){
 *       if (e) done()
 *       else done(null, src)
 *     })
 *   }]).then(function(jess){
 *     console.log(jess.path, jess.text)
 *   })
 *
 * @param {String} base, the current director
 * @param {String} name, of the module we are looking for
 * @param {Array} resolvers, an array of functions to run at each base
 * @return {Promise} for a file object
 */

exports.magic = function (base, name, resolvers) {
	var dir = base
	var promise = new Promise
	doUntil(
		function (done) {
			series(resolvers, function (checker, next) {
				if (checker.length > 2)
					checker(dir, name, next)
				else
					checker(dir, name), next()
			}, done)
		},
		function () {
			var res = dir === '/'
			dir = dirname(dir)
			return res
		},
		function (file) {
			if (file) {
				debug('%s -> %s = %s', base, name, file.path)
				promise.resolve(file)
			}
			else {
				debug('unable to resolve %s -> %s', base, name)
				promise.reject(new Error('unable to resolve '+base+' -> '+name))
			}
		}
	)
	return promise
}

/**
 * Retrieve a file from the internet
 *
 * @param {String} path
 * @return {Promise} for a file object
 */

exports.remote = function (path) {
	var promise = new Promise
	debug('Remote requesting %s', path)
	request.get(path).buffer().end(function (res) {
		debug('Response %s => %d', path, res.status)
		if (!res.ok)
			promise.reject(res.error)
		else 
			promise.resolve({
				'path': path,
				'text': res.text,
				'last-modified': Date.parse(res.headers['last-modified']) || Date.now()
			})
	})
	return promise
}

/**
 * Retrive a file from the local file system
 *
 * @param {String} path, absolute
 * @return {Promise} for a file object
 */

exports.local = function (path) {
	var promise = new Promise
	fs.stat(path, function (e, stat) {
		if (e) return promise.reject(e), debug('Local file %s doesn\'t exist', path)
		fs.readFile(path, 'utf-8', function (e, txt) {
			if (e) return promise.reject(e), debug('Problem reading %s', path)
			promise.resolve({
				'path': path,
				'text': txt,
				'last-modified': +stat.mtime
			})
			debug('Local resolved: %s', path)
		})
	})
	return promise
}
