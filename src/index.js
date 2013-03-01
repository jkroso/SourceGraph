var path = require('path')
  , dirname = path.dirname
  , pathJoin = path.join
  , url = require('url')
  , file = require('./file')
  , Promise = require('laissez-faire')
  , winner = require('winner')
  , all = require('when-all')
  , first = require('when-first').seq
  , unique = require('unique')
  , find = require('find')
  , debug = require('debug')('sourcegraph')

module.exports = Graph

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
	this._types = []
	this._hashResolvers = []
	this._osResolvers = []
	this._pending = []
	this.data = []
}

/**
 * Add a function to call when resolving named modules externally
 * Take a look at the 'nodish' plugin for an example of what this 
 * function might look like
 *
 * @param {Function} fn
 * @api private
 */

Graph.prototype.addOSResolver = function (fn) {
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

Graph.prototype.addHashResolver = function (fn) {
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

Graph.prototype.addType = function (type) {
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

Graph.prototype.use = function () {
	// Handle several args
	for (var i = 0, len = arguments.length; i < len; i++) {
		var name = arguments[i]
		
		var plug = require(__dirname+'/plugins/'+name)
		debug('Plugin %s provides: %pj', name, Object.keys(plug))

		plug.fileSystem && this.addOSResolver(plug.fileSystem)
		plug.hashSystem && this.addHashResolver(plug.hashSystem)
		
		plug.types && plug.types.forEach(function (type) {
			this.addType(type)
		}, this)
	}

	return this
}

/**
 * Retrive a file object
 *
 * @param {String} base the directory wher the file is being required from
 * @param {String} name the name of the module being required
 * @return {Promise} for a file object
 * @api private
 */

Graph.prototype.getFile = function (base, name) {
	if (isMagic(name)) {
		// Note: if the base is remote this won't work
		var mapfn = function (path) {
			return file.magic(base, path, this._osResolvers)
		}
	}
	else if (isProtocol(name)) {
		var mapfn = function (path) {
			return file.remote(path)
		}
	}
	else if (isAbsolute(name)) {
		var mapfn = function (path) {
			return file.local(path)
		}
	}
	else if (isProtocol(base)) {
		var mapfn = function (path) {
			return file.remote(url.resolve(base, path))
		}
	}
	else {
		var mapfn = function (path) {
			return file.local(pathJoin(base, path))
		}
	}

	return first(this.completions(name).map(mapfn, this))
}

function isAbsolute (p) {
	return !!p.match(/^\//)
}

function isMagic (p) {
	return p.match(/^\w/) && !isProtocol(p)
}

function isProtocol (p) {
	return !!p.match(/^[a-zA-Z]+:/)
}

/**
 * Recursive version of `Graph.prototype.add`
 * 
 * @param  {String} entry, a path to a file
 * @return {Self}
 */

Graph.prototype.trace = function (entry) {
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
			debug('#%d fetching: %s -> %s', module.id, module.base, path)
			return self.addModule(module.base, path).end(relate)
		})

		function relate (child) {
			if (!child) return
			child.parents.push(module.path)
			module.children.push(child.path)
		}
		
		// return a promise for when all dependencies have been traced
		return all(deps.map(function (promise) {
			return promise.then(trace)
		}))
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

Graph.prototype.then = function (callback, fail) {
	return all(this._pending).yeild(this.data).then(callback, fail)
}

/**
 * Determine the path of a module already stored with the sourcegraph
 *
 * @see addModule
 * @return {String} the full path of the file
 * @api private
 */

Graph.prototype.resolveInternal = function (base, path) {
	if (!path) throw new Error('No path provided in a require from '+base)
	var hash = this.data
	// Is it a proper path
	if (path.match(/^(?:\/|\.)/)) {
		if (base[0] === '/') {
			path = pathJoin(base, path)
		} else {
			path = url.resolve(base+'/', path)
		}
		return find(this.completions(path), function (path) {
			return path in hash
		})
	}
	// Or a Graph.prototypecol
	else if (path.match(/^[a-zA-Z]+:/)) {
		if (path in hash) return path
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
 * TODO: implement dispatch on Graph.prototypecol. eg http https git ftp ...etc
 */

Graph.prototype.addModule = function (base, path) {
	var self = this

	if (typeof path === 'object') {
		debug('Sudo file')
		return Promise.fulfilled(path).then(add)
	}

	return this.getFile(base, path).then(add, function (e) {
		debug('Failed to fetch %s -> %s: %s', base, path, e)
	})

	function add (file) {
		debug('Received: %s', file.path)
		if (self.data[file.path]) {
			debug('A file like it has been added while in flight though so it will not be added again')
			return
		}
		var module = modulize(self._types, file)
		if (module) {
			self.insert(module)
			return module
		}
		debug('__Ignoring__: %s since it has no module type', file.path)
	}
}

/**
 * Add a file
 *
 * @param {String} path absolute path
 * @public
 */

Graph.prototype.add = function (path) {
	var promise = this.addModule('/', path)
	promise && this._pending.push(promise)
	return this
}

/**
 * Add a module to the sourcegraph
 *
 * @param {Module} module
 */

Graph.prototype.insert = function (module) {
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
	module.ext = path.extname(name)
	module.name = path.basename(name, module.ext)
	// Remove the dot
	module.ext = module.ext.replace(/^\./, '')
	module.lastModified = file['last-modified'] || Date.now()
	module.requires = unique(module.requires())
	return module
}

/**
 * Retrieve the module stored within the sourcegraph
 *
 * @see addModule
 * @return {Module}
 */

Graph.prototype.get = function (base, path) {
	return this.data[this.resolveInternal(base, path)]
}

/**
 * Is the file already listed in the sourcegraph
 *
 * @see addModule
 * @return {Boolean}
 */

Graph.prototype.has = function (base, path) {
	return this.resolveInternal(base, path) !== undefined
}

/**
 * Create a list of possible inferred files names
 *
 *   completions('path') // => ['path.js', 'path/index.js']
 * 
 * @param  {String} path
 * @return {Array}
 * @private
 */

Graph.prototype.completions = function (path) {
	var types = this._types
	var result = [path]
	for (var i = 0, len = types.length; i < len; i++) {
		var Type = types[i]
		if (Type.completions) {
			result = result.concat(Type.completions(path))
		}
	}
	return unique(result)
}
