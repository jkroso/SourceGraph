var detectSeries = require('async').detectSeries
  , readFile = require('../../file').local
  , join = require('path').join
  , fs = require('fs')

/*!
 * Location of core node modules
 */
var base = __dirname + '/modules/'

/*!
 * Create a mapping of available core node modules
 */
var core = fs.readdirSync(base).reduce(function (acc, x) {
	acc[x] = true
	return acc
}, {})

/**
 * Produce an ordered list of path to try
 * 
 * @param {String} dir
 * @param {String} path
 * @return {Array} of path
 * @api private
 */

function variants (dir, path) {
	// Is it a full path already
	if (path.match(/\.js(?:on)?$/)) {
		path = [path]
	}
	// A directory
	else if (path.match(/\/$/)) {
		path = [
			path+'index.js',
			path+'index.json',
			path+'package.json'
		]
	}
	// could be a directory or a file
	else {
		path = [
			path+'.js',
			path+'.json',
			path+'/index.js',
			path+'/index.json',
			path+'/package.json'
		]
	}

	return path.map(function (name) {
		return join(dir, 'node_modules', name)
	})
}

/**
 * Look for a given module with a given directory
 *
 * @param {String} dir
 * @param {String} name
 * @param {Function} done to pass results to when ready
 */

exports.fileSystem = function (dir, name, done) {
	detectSeries(variants(dir, name), fs.exists, function(winner){
		if (winner) {
			readFile(winner).end(done)
		} else {
			// In node core modules take priority over custom
			// This doesn't work when building projects with other systems so instead here 
			// built in modules take the lowest priority. They probably should in node too but 
			// they don't so this could cause bugs for some node modules. I've made the call to 
			// differ here since I believe it will cause less problems than it creates.
			if (dir === '/' && core[name+'.js']) {
				readFile(base+name+'.js').then(function (file) {
					// Pretend the file came from a global node_modules directory
					// Which in my opinion is where it should of come from anyway
					file.path = '/node_modules/'+name+'.js'
					return file
				}).end(done)
			} else {
				done()
			}
		}
	})
}

/**
 * Like file system but operates on a hash rather than the filesystem
 *
 * @param {String} dir
 * @param {String} name
 * @param {Object} hash contains all known files as keys
 * @return {String} full path of the module
 */

exports.hashSystem = function (dir, name, hash) {
	var match = variants(dir, name).filter(function (p) {
		return !!hash[p]
	})[0]

	if (match) return match

	if (dir === '/' && hash['/node_modules/'+name+'.js'])
		// Note: we always add ".js" at the end since node won't interpret those as core modules
		return '/node_modules/'+name+'.js'
}

/**
 * Handler for package.json files
 */

exports.types = [
	NodePackage
]

function NodePackage (file) {
	this.path = file.path
	this.text = file.text
}

NodePackage.test = function (file) {
	if (file.path.match(/\/package\.json$/)) return 2
}

NodePackage.prototype.requires = function () {
	var deps = []
	var main = JSON.parse(this.text).main
	if (main != null) {
		if (main.match(/^\w/)) main = './'+main
		deps.push(main)
	}
	return deps
}

/*!
 * Expose the variants function and base path for others to use
 * For example bigfile uses them in its development builds
 */
exports.variants = variants
exports.basePath = base
