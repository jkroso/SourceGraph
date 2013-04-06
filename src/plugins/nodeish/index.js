
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
		return join(dir, 'node_modules', name)
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
	return detect(variants(dir, name), function(path, cb){
		fs.stat(path, function(err, stat){
			cb(!err && stat.isFile())
		})
	}).then(readFile, function(reason){
		// node core
		if (dir === '/' && core[name+'.js']) {
			return readFile(base+name+'.js').then(function (file) {
				// Pretend the file came from a global node_modules directory
				file.path = '/node_modules/'+name+'.js'
				return file
			})
		}
		reason.message = 'unable to find ' + dir + ' -> ' + name
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
	if (dir === '/' && hash['/node_modules/'+name+'.js']) {
		return '/node_modules/'+name+'.js'
	}
}

exports.types = [
	Component,
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

/**
 * Extract dependency info from component.json files.
 * 
 * [components](github.com/component/component) are typically straight
 * forward to use from node style code but if they include css or images 
 * its unlikely they will be required anywhere other that in the `.json`
 *
 * To use a component from node style code you should 
 * `require('foo/component.json')` rather than simply `require('foo')`
 */

function Component (file) {
	this.path = file.path
	this.text = file.text
}

Component.test = function (file) {
	if (file.path.match(/\/component\.json$/)) {
		return 2
	}
}

Component.prototype.requires = function () {
	var data = JSON.parse(this.text)
	  , deps = []
	  , base = this.base

	data.dependencies && Object.keys(data.dependencies).forEach(function (dep) {
		// only interested in the components name since 
		// we are pretending this is a npm package
		deps.push(dep.split('/')[1])
	})

	// js files
	if (data.scripts) {
		if (!(data.scripts instanceof Array)) throw new Error('Scripts should be an array')
		data.scripts.forEach(function (path) {
			// paths are always relative but they may not be written that way
			if (path.match(/^\w/)) path = './'+path
			deps.push(path)
		})
	}

	// css files
	data.styles && data.styles.forEach(function (path) {
		if (path.match(/^\w/)) path = './'+path
		deps.push(path)
	})

	// TODO: templates

	return deps
}

/*!
 * Expose the variants function and base path for others to use
 * For example bigfile uses them in its development builds
 */

exports.variants = variants
exports.basePath = base
