var getExt = require('path').extname
  , joinPath = require('path').join
  , parentDir = require('path').dirname
  , resolvePath = require('path').resolve
  , getFile = require('./file')
  , Promise = require('laissez-faire')
  , Emitter = require('emitter')
  , all = require('when-all')
  , debug = require('debug')('sourcegraph')

require('colors')

exports = module.exports = Graph

var proto = Graph.prototype
Emitter.mixin(proto)

/**
 * Graphs represent the complete source code of your program.
 * They trace dependencies and give you a list of files at the end
 *
 *   new Graph().trace('/path/to/my/project').then(function(files){
 *     files.forEach(function(file){
 *       console.log(file.text)
 *     })
 *   })
 */

function Graph () {
	this._fileTypes = []
	this._hashResolvers = []
	this._osResolvers = []
	this._pending = []
	this.data = []
}

proto.getFile = getFile([])

proto.addResolver = function (os, hash) {
	return this.addOSResolver(os).addHashResolver(hash)
}

proto.addOSResolver = function (fn) {
	if (typeof fn !== 'function')
		throw new Error('OS resolver must be function')
	this._osResolvers.push(fn)
	this.getFile = getFile(this._osResolvers)
	return this
}

proto.addHashResolver = function (fn) {
	if (typeof fn !== 'function')
		throw new Error('Hash resolver must be function')
	this._hashResolvers.push(fn)
	return this
}

proto.addType = function (type) {
	if (!(type.if instanceof RegExp))
		throw new Error('File handler must have a RegExp under its `if` property')
	if (typeof type.make !== 'function')
		throw new Error('File handler must have a Function under its `make` property')
	this._fileTypes.push(type)
	return this
}

/**
 * Recursive version of `proto.add`
 * 
 * @param  {String} entry, a path to a file
 * @return {Promise} for a nested array of modules
 */

proto.trace = function (entry) {
	var self = this
	var promise = this.addModule('/', entry).then(function trace (module) {
		var deps = module.requires()
		debug('#%d dependencies: %pj', module.id, deps)
		if (!deps.length) return module
		
		// Filter out the files already in the graph
		deps = deps.filter(function (path) {
			if (typeof path !== 'string') path = path.path
			if (self.has(module.base, path)) {
				debug('#%d\'s dependency %s already exists', module.id, path)
			} else {
				return true
			}
		})
		if (!deps.length) return module

		deps = deps.map(function (path) {
			debug('#%d fetching: %s from %s', module.id, path, module.base)
			return self.addModule(module.base, path)
		})

		return all(deps).then(function (modules) {
				debug('done')
			return all(modules.filter(Boolean).map(trace))
		}).end(function () {
			debug('%s completed finally', module.id)
		})
	})
	
	this._pending.push(promise)
	
	return this
}

/**
 * Generate an array of all modules within the sourcegraph
 *
 * @param {Function} callback, for when the values are ready
 * @return {Promise} for an array of modules
 */

proto.then = function (callback) {
	var self = this
	if (this._pending.length) {
		return all(this._pending).then(function (d) {
			self._pending.length = 0
			return self.data
		}).then(callback)
	}
}

/**
 * Determine the path of a module already stored with the sourcegraph
 *
 * @see addModule
 * @return {String} if a file exists its path will be returned
 * @api private
 */

proto.resolveInternal = function (base, path) {
	if (!path) throw new Error('No path provided in a require from '+base)
	var hash = this.data
	// Is it a proper path
	if (path.match(/^\/|\.|[a-zA-Z]+:/)) {
		path = resolvePath(base, path)
		var paths = pathVariants(path)
		  , i = paths.length
		while (i--) {
			if (paths[i] in this) return paths[i]
		}
	}
	// Its a component or package name
	else {
		var checks = this._hashResolvers
		do {
			for (var i = 0, len = checks.length; i < len; i++) {
				var res = checks[i](hash, base, path)
				if (res) return res
			}
			base = parentDir(base)
		}
		while (base !== '/') 
	}
}

/**
 * Add a module to the sourcegraph
 *
 *   graph.add('/current/working/directory', 'super-module')
 *   graph.add('/current/working/directory', 'http://code.com/super-module')
 *   graph.add('/current/working/directory', '../super-module')
 * 
 * @param {String} base
 * @param {String} path
 * @return {Promise} for the module that gets inserted
 */

proto.addModule = function (base, path) {
	var self = this

	if (typeof path === 'object') {
		debug('Sudo file')
		return Promise.fulfilled(path).then(add)
	}

	return this.getFile(base, path).then(add, function (e) {
		debug('Failed registration: %s', e)
		self.emit('load-error', e)
	})

	function add (file) {
		debug('Received: %s', file.path)
		var module = modulize(self._fileTypes, file)
		if (module) {
			self.insert(module)
			return module
		}
		else {
			debug('Ignoring: %s, since it has no module type', file.path)
		}
	}
}

/**
 * Add a file
 *
 * @param {String} path absolute path
 * @public
 */
proto.add = function (path) {
	var promise = this.addModule('/', path)
	promise && this._pending.push(promise)
	return this
}

/**
 * Add a module to the sourcegraph
 *
 * @param {Module} module
 */
proto.insert = function (module) {
	this.emit('new-module', module)
	this.data.push(module)
	this.data[module.path] = module
	module.id = this.data.length
	debug('#%d = %s', module.id, module.path)
}

/**
 * Convert a file object into its module type
 *
 * @param {Array} types
 * @param {Object} file
 * @api private
 */

function modulize (types, file) {
	for ( var i = 0, len = types.length; i < len; i++ ) {
		if (types[i].if.test(file.path)) 
			return new types[i].make(file)
	}
}

/**
 * Determine all the paths that would have resulted in finding this file
 * 
 * @param  {String} p a complete file path
 * @return {Array} all paths that would have found this file
 * @api private
 */
function pathVariants (p) {
	var results = [p]
	// Is it an explicit directory
	if (p.match(/\/$/)) 
		results.push(
			p+'index.js',
			p+'index'
		)
	// Did they end it without an extension
	else if (!p.match(/\.\w+$/)) results.push(
		p+'.js', 
		p+'/index.js'
	)
	
	// Could they of simply named the directory
	if (p.match(/\/index\.js(?:on)?$/)) 
		results.push(
			p.replace(/index\.js(?:on)?$/, ''),
			p.replace(/\/index\.js(?:on)?$/, '')
		)

	// Could they of left of the extension
	if (p.match(/\.js(?:on)?$/)) 
		results.push(p.replace(/\.js(?:on)?$/, ''))

	return results
}

/**
 * Retrieve the module stored within the sourcegraph
 *
 * @see addModule
 * @return {Module}
 */
proto.get = function (base, path) {
	return this.data[this.resolveInternal(base, path)]
}

/**
 * Is the file already listed in the sourcegraph
 *
 * @see addModule
 * @return {Boolean}
 */
proto.has = function (base, path) {
	return this.resolveInternal(base, path) !== undefined
}