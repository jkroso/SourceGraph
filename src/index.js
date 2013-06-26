
var debug = require('debug')('sourcegraph')
  , each = require('foreach/async')
  , getfile = require('./file')
  , winner = require('winner')
  , unique = require('unique')
  , util = require('./utils')
  , find = require('detect')
  , path = require('path')
  , url = require('url')

module.exports = Graph

// module counter
var id = 1

/**
 * configuration hub
 */

function Graph () {
	this.types = []
	this.hashReaders = []
	this.fsReaders = []
	this.graph = {}
	this.packageDirectory = 'node_modules'
}

/**
 * get a file from where-ever
 * 
 * @param {String} base
 * @param {String} path
 * @return {Object} file
 */

Graph.prototype.getFile = getfile

/**
 * add a file and it dependencies to `this` graph
 * 
 * @param {String} path
 * @return {Promise} graph
 */

Graph.prototype.add = function(path){
	var self = this
	return this.getFile(process.cwd(), path)
		.then(this.addFile.bind(this), function(){ 
			throw new Error('unable to get '+path)
		})
		.then(this.trace.bind(this))
		.then(function(){
			return self.graph
		}) 
}

/**
 * add a module and its aliases to the graph
 * 
 * @param {Object} file
 * @return {Module} if its new
 */

Graph.prototype.addFile = function(file){
	var module = this.graph[file.path]
	var isNew = !module
	if (isNew) {
		debug('received: %p', file.path)
		module = modulize(file, this.types)
		this.graph[module.path] = module
	} 
	if (file.alias) {
		debug('alias: %p -> %p', file.alias, file.path)
		module.aliases.push(file.alias)
		this.graph[file.alias] = module
	}
	if (isNew) return module
}

/**
 * recursively add the dependencies of `module`
 * to `this` graph
 * 
 * @param {Module} module
 * @return {Promise} null
 */

Graph.prototype.trace = function(module){
	// sudo files
	module.requires
		.filter(isObject)
		.forEach(this.addFile, this)

	var newDeps = module.requires
		.filter(isString)
		.filter(function(path){
			var child = this.get(module.base, path)
			if (child) relate(module, child)
			return !child
		}, this)

	return each(newDeps, function(path){
		debug('#%d fetching: %p -> %p', module.id, module.base, path)
		var self = this
		return this.getFile(module.base, path)
			.then(this.addFile.bind(this), function(e){
				throw new Error('unable to get '+module.base+' -> '+path)
			})
			.then(function(child){
				if (!child) return
				relate(module, child)
				return self.trace(child)
			})
	}, this)
}

function isObject(x){
	return typeof x == 'object'
}

function isString(x){
	return typeof x == 'string'
}

// set parent child relationship
function relate(parent, child){
	child.parents.push(parent.path)
	module.children.push(child.path)
}

/**
 * Convert a file object into a Module
 *
 * @param {Object} file
 * @param {Array} types
 * @return {Module}
 */

function modulize(file, types){
	var Type = winner(types, function (type) {
		return type.test(file) || 0
	}, 1)
	if (Type) {
		var module = new Type(file)
	} else {
		var module = file
		debug('no module type for '+file.path)
	}
	var name = module.path
	module.parents = []
	module.children = []
	module.aliases = []
	module.base = path.dirname(name)
	module.ext = path.extname(name)
	module.name = path.basename(name, module.ext)
	// Remove the dot
	module.ext = module.ext.replace(/^\./, '')
	module.lastModified = file['last-modified'] || Date.now()
	module.requires = Type ? unique(module.requires()) : []
	debug('#%d = %p', id, module.path)
	debug('#%d dependencies: %j', id, module.requires)	
	module.id = id++
	return module
}

/**
 * determine which file a `require(req)` from `dir` 
 * would result in. Only cached modules are considered
 * 
 * @param {String} dir
 * @param {String} req
 * @return {String} path
 */

Graph.prototype.which = function(dir, req){
	var graph = this.graph
	var path = util.joinPath(dir, req)
	if (!path) return whichPackage.call(this, dir, req)
	return find(this.completions(path), function (path) {
		return path in graph
	})
}

/**
 * see which cached package a `require(req)` from a file 
 * in `dir` resolves to. A package in most cases is just
 * an external dependency
 * 
 * @param {String} dir
 * @param {String} req
 * @return {String} paht
 */

function whichPackage(dir, req){
	if (util.isRemote(dir)) throw new Error('not supporting remote packages yet')
	var checks = this.hashReaders
	var graph = this.graph
	while (true) {
		var modir = path.join(dir, this.packageDirectory)
		for (var i = 0, len = checks.length; i < len; i++) {
			var res = checks[i].call(this, modir, req, graph)
			if (res) return res
		}
		if (dir == '/') break
		dir = path.dirname(dir)
	}
}

/**
 * Retrieve the module stored within the sourcegraph
 * 
 * @param {String} base
 * @param {String} path
 * @return {Module}
 */

Graph.prototype.get = function(base, path){
	path = this.which(base, path)
	return path && this.graph[path]
}

/**
 * Is the file already listed in the sourcegraph
 * 
 * @param {String} base
 * @param {String} path
 * @return {Boolean}
 */

Graph.prototype.has = function(base, path){
	return this.which(base, path) != null
}

/**
 * List possible file completions
 * 
 *   graph.completions('path') => ['path.js', 'path/index.js']
 * 
 * @param {String} path
 * @return {Array} paths
 */

Graph.prototype.completions = function(path){
	var paths = this.types.reduce(function(res, Type){
		if (!Type.completions) return res
		return res.concat(Type.completions(path))
	}, [path])
	return unique(paths)
}

/**
 * remove all files so the graph can be rebuilt
 * @return {this}
 */

Graph.prototype.clear = function(){
	id = 1
	this.graph = {}
	return this
}
