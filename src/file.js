var fs = require('fs')
  , dirname = require('path').dirname
  , resolvePath = require('path').resolve
  , Promise = require('laissez-faire')
  , request = require('request')
  , first = require('when-first')
  , doUntil = require('async-loop').doUntil
  , series = require('async-forEach').series
  , resolveURL = require('url').resolve
  , debug = require('debug')('getfile')

/**
 * Fetch a file from any type of path
 *
 * @param {String} base, current directory
 * @param {String} path, [url, file path, or module path]
 * @param {Array} resolvers, containing functions
 * @return {Promise} for a file object
 */

exports = module.exports = function (resolvers) {
	return function dispatch (base, path) {
		if (isMagic(path)) {
			// Note: if the base is remote this won't work
			return getMagic(base, path, resolvers)
		} 
		else if (isProtocol(base)) {
			if (isProtocol(path) || !isAbsolute(path))
				return getRemote(resolveURL(base, path))
			else
				return getFile(path)
		}
		else {
			if (isProtocol(path)) {
				return getRemote(path)
			} else {
				return getFile(resolvePath(base, path))
			}
		}
	}
}

/**
 * Example:
 *   /path/to/file // => true
 *   ./path/to/file // => false
 */

function isAbsolute (p) {
	return !!p.match(/^\//)
}

/**
 * Example:
 *   jess // => true
 *   ./jess // => false
 */

function isMagic (p) {
	return p.match(/^\w/) && !isProtocol(p)
}

/**
 * Example:
 *   http://google.com // => true
 *   /local/path // => false
 */

function isProtocol (p) {
	return !!p.match(/^[a-zA-Z]+:/)
}

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

exports.magic = getMagic
function getMagic (base, name, resolvers) {
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
				debug('%s resolved to %s', name, file.path)
				promise.resolve(file)
			}
			else {
				debug('unable to resolve % from % base', name, base)
				promise.reject('unable to resolve '+name+' from '+base)
			}
		}
	)
	return promise
}

/**
 * Generate some paths to attempt
 * 
 * @param  {String} p the path
 * @return {Array}   the original path plus any others worth trying
 */
exports.variants = variants
function variants (p) {
	// Always try the path as is first
	var results = [p]
	// If its a directory
	if (p.match(/\/$/)) results.push(
		p+'index.js',
		p+'index.json'
	)
	// If no extension
	else if (!p.match(/\.\w+$/)) results.push(
		p+'.js', 
		p+'.json', 
		p+'/index.js', 
		p+'/index.json'
	)
	debug('Variants: %pj', results)
	return results
}

/**
 * Retrieve a file from any absolute path
 * 
 * @param  {String} p e.g. http://google.com or /dev/file.js
 * @return {File}   Custom file type conbining meta data and content e.g. {last-modified:x, text:...}
 */

exports.local = getFile
function getFile (p) {
	return first(variants(p).map(readFile))
}

/**
 * Retrieve a file from the internet
 *
 * @param {String} path
 * @return {Promise} for a file object
 */

exports.remote = getRemote
function getRemote (p) {
	return first(variants(p).map(function (p) {
		var promise = new Promise
		debug('Remote requesting %', p)
		request.get(p, function (error, res, body) {
			if (error || res.statusCode >= 400) 
				promise.reject(error), debug('Response % => %d', p, res.statusCode)
			promise.resolve({
				'path': p,
				'text': body,
				'last-modified': Date.parse(res.headers['last-modified']) || Date.now()
			})
			debug('Remote recieve %', p)
		})
		return promise
	}))
}

/**
 * Retrive a file from the local file system
 *
 * @param {String} path, absolute
 * @return {Promise} for a file object
 */

exports.readLocal = readFile
function readFile (path) {
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
