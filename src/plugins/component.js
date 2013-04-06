var readFile = require('../file').local
  , join = require('path').join
  , fs = require('fs')

/**
 * Produce an ordered list of paths to try
 * 
 * Note: we only look for component.json files since code written for 
 * components usually won't work without the environment config that
 * is specified in there meta data files.
 * 
 * @param {String} dir
 * @param {String} path
 * @return {Array} of path
 * @api private
 */

function variants (dir, path) {
	return [
		// Check for an alias...
		path,
		// ...and a real component
		path+'/component.json'
	].map(function (name) {
		return join(dir, 'components', name)
	})
}

/**
 * Look for a given module with a given directory. In this case we are 
 * looking for a component so we look inside the components sub-folder
 * for the components meta data file.
 *
 * @param {String} dir
 * @param {String} name
 * @param {Function} done to pass results to
 */

exports.fileSystem = function (dir, name, done) {
	var path = join(dir, 'components', name, 'component.json')
	fs.exists(path, function(yes){
		if (yes) {
			readFile(path).end(done)
		} else {
			done()
		}
	})
}

/**
 * Like file system but operates on a hash rather than the filesystem
 *
 * @param {String} dir
 * @param {String} name
 * @param {Object} hash contains all known files as keys
 * @return {String} path of the module
 */

exports.hashSystem = function (dir, name, hash) {
	return variants(dir, name).filter(function (p) {
		return !!hash[p]
	})[0]
}

/**
 * Handler for component.json files
 */

exports.types = [
	Component,
	SudoComponent
]

var JS = require('./javascript').types[0]

function SudoComponent (file) {
	this.path = file.path
	this.text = file.text
}

SudoComponent.prototype.requires = JS.prototype.requires

SudoComponent.test = function (file) {
	if (file.path.match(/\/components\/\w+$/)) {
		if (file.text.match(/^module\.exports\s*=\s*require\([^\)]+\)$/))
			return Infinity
		else
			return 2
	}
}

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
		// Replace the first slash with a dash
		var fullname = dep.replace(/\//, '-')

		deps.push(fullname)
		
		// Create an alias just for the current base...
		// ...or lower but that never happens with coponents
		deps.push({
			'path': join(base, 'components', dep.split('/')[1] || dep.split('/')[0]),
			'text': 'module.exports = require("'+fullname+'")',
			'last-modified': Date.now()
		})
	})

	// include all scripts up front
	if (data.scripts) {
		if (!(data.scripts instanceof Array)) throw new Error('Scripts should be an array')
		data.scripts.forEach(function (path) {
			if (path[0].match(/\w/)) path = './'+path
			deps.push(path)
		})
	}

	data.styles && data.styles.forEach(function (path) {
		if (path[0].match(/\w/)) path = './'+path
		deps.push(path)
	})

	return deps
}

/*!
 * Expose the variants function for others to use
 * For example bigfile uses it in its development builds
 */
exports.variants = variants