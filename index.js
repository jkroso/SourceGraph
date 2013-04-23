
var Graph = require('./src/index')
  , unique = require('unique')
  , debug = require('debug')('sourcegraph:config')

module.exports = Graph

///////////////////////////
// add configuration api //
///////////////////////////

/**
 * Add package resolver that operates over the filesystem
 *
 * @param {Function} fn
 * @return {this}
 */

Graph.prototype.addFSReader = function (fn) {
	assertFn(fn)
	this.fsReaders.push(fn)
	this.fsReaders = unique(this.fsReaders)
	return this
}

/**
 * Add package resolver that operates over a file cache
 *
 * @param {Function} fn
 * @return {this}
 */

Graph.prototype.addHashReader = function (fn) {
	assertFn(fn)
	this.hashReaders.push(fn)
	this.hashReaders = unique(this.hashReaders)
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
 * @param {Function} type 
 * @return {this}
 */

Graph.prototype.addType = function (type) {
	assertFn(type)
	this.types.push(type)
	this.types = unique(this.types)
	return this
}

/**
 * Load a plugin. A plugin is just a grab bag of stuff
 *
 * @param {String...} name of the plugin(s)
 * @return {this}
 */

Graph.prototype.use = function () {
	// Handle several args
	for (var i = 0, len = arguments.length; i < len; i++) {
		var name = arguments[i]
		var plug = require(__dirname+'/src/plugins/'+name)
		debug('plugin %s provides: %j', name, Object.keys(plug))

		if (plug.fileSystem) {
			assertFn(plug.hashSystem)
			this.addFSReader(plug.fileSystem)
		}
		if (plug.hashSystem) {
			assertFn(plug.hashSystem)
			this.addHashReader(plug.hashSystem)
		}
		
		plug.types && plug.types.forEach(this.addType, this)
	}
	return this
}

function assertFn(fn){
	if (typeof fn != 'function') throw new Error('Expected a function')
}
