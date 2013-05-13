
var detect = require('detect/series')
  , readFile = require('../../file').fs
  , join = require('path').join
  , fs = require('fs')

// Location of core node modules
var base = __dirname + '/modules/'

// Create a mapping of available core node modules
var core = fs.readdirSync(base).reduce(function (acc, x) {
	acc[x] = true
	return acc
}, {})

/**
 * Produce an ordered list of paths to try
 * 
 * @param {String} dir
 * @param {String} path
 * @return {Array} of path
 * @private
 */

function variants (dir, path) {
	// A directory
	if (path.match(/\/$/)) {
		path = [
			path+'index.js',
			path+'index.json',
			path+'package.json'
		]
	}
	// could be a directory or a file
	else {
		path = [
			path,
			path+'.js',
			path+'.json',
			path+'/index.js',
			path+'/index.json',
			path+'/package.json'
		]
	}

	return path.map(function (name) {
		return join(dir, name)
	})
}

/**
 * Look for a given module with a given directory
 * 
 * Note: In node, core modules, take priority over custom
 * ones. In this system they don't since I find it a pain
 *
 * @param {String} dir
 * @param {String} name
 * @param {Function} done to pass results to when ready
 */

exports.fileSystem = function(dir, name){
	return detect(variants(dir, name), function(path, i, cb){
		fs.stat(path, function(err, stat){
			cb(!err && stat.isFile())
		})
	}).then(readFile, function(reason){
		// is top level directory
		if (dir.lastIndexOf('/') <= 0 && core[name+'.js']) {
			return readFile(base + name + '.js').then(function (file) {
				// Pretend the file came from the global directory
				file.path = dir + '/' + name + '.js'
				return file
			})
		}
		reason.message = 'unable to find ' + dir + '/' + name
		throw reason
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
		return p in hash
	})

	if (match.length) {
		if (match.length > 1) 
			console.warn('%s -> %s has several matches', dir, name)
		return match[0]
	}

	// core modules
	if (dir.lastIndexOf('/') <= 0 && hash[dir+'/'+name+'.js']) {
		return dir+'/'+name+'.js'
	}
}

exports.types = [
	NodePackage,
	require('../javascript').types[0],
	require('../json').types[0]
]

/**
 * Handler for package.json files
 * 
 * npm package.json files sometimes include a `main` 
 * property. If so that file would likely otherwise 
 * not be picked up. In general though all dependencies
 * for npm packages is found within the source files 
 * themselves
 */

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
