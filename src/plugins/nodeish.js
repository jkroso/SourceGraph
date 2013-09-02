
var readFile = require('../graph').readFile
var core = require('browser-builtins')
var detect = require('detect/series')
var fs = require('lift-result/fs')
var join = require('path').join

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
 * @return {Promise} path|file
 */

exports.fileSystem = function(dir, name){
	return detect(variants(dir, name), function(path){
		return fs.stat(path).then(function(stat){
			return stat.isFile()
		}, function(){
			return false
		})
	}).then(null, function(reason){
		// is top level directory
		if (dir.lastIndexOf('/') <= 0 && name in core) {
			return readFile(core[name]).then(function(file){
				// Pretend the file came from the global directory
				file.alias = dir + '/' + name + '.js'
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
	return variants(dir, name).filter(function (path) {
		return path in hash
	})[0]
}

exports.types = [ NodePackage ]
	.concat(require('./javascript').types)
	.concat(require('./json').types)

exports.variants = variants

/**
 * Handler for package.json files
 *
 * npm package.json files sometimes include a `main`
 * property. If so that file would likely otherwise
 * not be picked up. In general though all dependencies
 * for npm packages is found within the source files
 * themselves
 */

function NodePackage(file){
	this.path = file.path
	this.text = file.text
}

NodePackage.test = function(file){
	if (file.path.match(/\/package\.json$/)) return 2
}

NodePackage.prototype.requires = function(){
	var deps = []
	var main = JSON.parse(this.text).main
	if (main != null) {
		if (main.match(/^\w/)) main = './'+main
		deps.push(main)
	}
	return deps
}