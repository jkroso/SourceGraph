var getExt = require('path').extname
  , joinPath = require('path').join
  , parentDir = require('path').dirname
  , resolvePath = require('path').resolve
  , getFile = require('./file')
  , Promise = require('laissez-faire')
  , Emitter = require('emitter')
  , all = require('when-all')
  , debug = require('debug')('sourcegraph')

exports = module.exports = Graph

/*!
 * Inherit from Emitter
 */
var proto = Graph.prototype
proto.__proto__ = Emitter.prototype

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
	Emitter.call(this)
	this._fileTypes = []
	this._hashResolvers = []
	this._osResolvers = []
	this._pending = []
	this.data = []
	this.getFile = getFile(this._osResolvers)
}

/**
 * Add a function to call when resolving named modules externally
 * Take a look at the 'nodish' plugin for an example of what this 
 * function might look like
 *
 * @param {Function} fn
 * @api private
 */

proto.addOSResolver = function (fn) {
	this._osResolvers.push(fn)
	this.getFile = getFile(this._osResolvers)
	return this
}

/**
 * Add a function to call when resolving named modules internally
 * Take a look at the 'component' plugin for an example of what this 
 * function might look like
 *
 * @param {Function} fn
 * @api private
 */

proto.addHashResolver = function (fn) {
	this._hashResolvers.push(fn)
	return this
}

/**
 * Add a module definition. For example the definition of a javascript module
 * looks a bit like this.
 *
 *   graph.addType({
 *     if: /\.js$/
 *     make: function JS (file) {
 *       this.path = file.path
 *       this.text = file.text
 *     }
 *   })
 *
 * @param {Object} type 
 *   `.if` should be a regex and will be matched again paths
 *   `.make` should be a constructor
 * @return {Self}
 */

proto.addType = function (type) {
	if (!(type.if instanceof RegExp))
		throw new Error('File handler must have a RegExp under its `if` property')
	if (typeof type.make !== 'function')
		throw new Error('File handler must have a Function under its `make` property')
	this._fileTypes.push(type)
	return this
}

/**
 * Load a plugin
 *
 * @param {String...} name of the plugin(s)
 * @return {Self}
 */

proto.use = function (name) {
	// Handle several args
	if (arguments.length > 1) {
		for (var i = 0, len = arguments.length; i < len; i++) {
			this.use(arguments[i])
		}
		return this
	}

	var plug = require(__dirname+'/plugins/'+name)
	debug('Plugin %s provides: %pj', name, Object.keys(plug))

	plug.fileSystem && this.addOSResolver(plug.fileSystem)
	plug.hashSystem && this.addHashResolver(plug.hashSystem)
	
	plug.types && plug.types.forEach(function (type) {
		this.addType(type)
	}, this)

	return this
}

/**
 * Recursive version of `proto.add`
 * 
 * @param  {String} entry, a path to a file
 * @return {Self}
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
			return all(modules.filter(Boolean).map(trace))
		})
	})
	
	this._pending.push(promise)
	
	return this
}

/**
 * Retrieve the value of the sourcegraph
 *
 * @param {Function} callback, for when the values are ready
 * @param {Function} fail, error handler
 * @return {Promise} for an array of modules
 */

proto.then = function (callback, fail) {
	return all(this._pending).yeild(this.data).then(callback, fail)
}

/**
 * Determine the path of a module already stored with the sourcegraph
 *
 * @see addModule
 * @return {String} the full path of the file
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
			if (paths[i] in hash) return paths[i]
		}
	}
	// Its a component or package name
	else {
		var checks = this._hashResolvers
		while (true) {
			for (var i = 0, len = checks.length; i < len; i++) {
				var res = checks[i](base, path, hash)
				if (res) return res
			}
			if (base === '/') break
			base = parentDir(base)
		}
	}
}

/**
 * Determine all the paths that would have resulted in finding this file
 * TODO: extract this function into a plugin
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
 * Add a module to the sourcegraph
 *
 *   graph.add('/current/working/directory', 'super-module')
 *   graph.add('/current/working/directory', 'http://code.com/super-module')
 *   graph.add('/current/working/directory', '../super-module')
 * 
 * @param {String} base
 * @param {String} path
 * @return {Promise} for the module that gets inserted
 *
 * TODO: consider allowing people to intercept requests for files in case they want
 * to do some trickery as in the mocha plugin.
 *
 * TODO: implement dispatch on protocol. eg http https git ftp ...etc
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
			debug('__Ignoring__: %s, since it has no module type', file.path)
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
 *
 * TODO: pick the best match not just the first
 */

function modulize (types, file) {
	for ( var i = 0, len = types.length; i < len; i++ ) {
		if (types[i].if.test(file.path)) 
			return new types[i].make(file)
	}
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