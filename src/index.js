var extname = require('path').extname
  , joinPath = require('path').join
  , dirname = require('path').dirname
  , basename = require('path').basename
  , resolvePath = require('path').resolve
  , getFile = require('./file')
  , Promise = require('laissez-faire')
  , Emitter = require('emitter')
  , winner = require('winner')
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
	this._types = []
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
 * Add a module definition. 
 * This is simply a constructor but it should have at least two functions associated with it. One is the requires function which should be an instance method that returns an Array of paths to the modules dependencies. The other is a "class method" defined under the property test. This is what is used to determine if this is a suitable type for a file. It will be passed a file object with {path:..., text:...} properties. `test` should return an Interger from 0 to Infinity based on how suitable the given file is for the module type. 0 meaning not suitable at all and Infinity meaning your absolutely certain.
 * 
 * Example definition of a Javascript module type:
 *
 *   function Javascript (file) {
 *     this.path = file.path     
 *     this.text = file.text
 *     this.requires = function () {
 *       return detective(this.text)
 *     }
 *   }
 *   Javascript.test = function (file) {
 *     var match = file.path.match(/\.js$/)
 *     return match ? 1 : 0
 *   }
 *   graph.addType(Javascript)
 *  
 * @param {Function} constructor 
 * @return {Self}
 */

proto.addType = function (type) {
	if (typeof type !== 'function')
		throw new Error('Expected a function')
	this._types.push(type)
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
		if (!module) return
		var deps = module.requires
		debug('#%d dependencies: %pj', module.id, deps)
		if (!deps.length) return module
		
		// Filter out the files already in the graph
		deps = deps.filter(function (path) {
			if (typeof path !== 'string') path = path.path
			var existing = self.get(module.base, path)
			if (existing) {
				relate(existing)
				debug('#%d\'s dependency %s already exists', module.id, path)
			} else {
				return true
			}
		})
		if (!deps.length) return module

		deps = deps.map(function (path) {
			debug('#%d fetching: %s from %s', module.id, path, module.base)
			return self.addModule(module.base, path).end(relate)
		})

		function relate (child) {
			if (!child) return
			child.parents.push(module.path)
			module.children.push(child.path)
		}

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
			base = dirname(base)
		}
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
		var module = modulize(self._types, file)
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
 */

function modulize (types, file) {
	var Type = winner(types, function (type) {
		return type.test(file) || 0
	}, 1)
	if (!Type) return
	var module = new Type(file)
	var name = module.path
	module.parents = []
	module.children = []
	module.base = dirname(name)
	module.ext = extname(name)
	module.name = basename(name, module.ext)
	// Remove the dot
	module.ext = module.ext.replace(/^\./, '')
	module.lastModified = file['last-modified'] || Date.now()
	module.requires = module.requires()
	return module
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