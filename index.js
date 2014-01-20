
var debug = require('debug')('sourcegraph')
var doUntil = require('async-loop').doUntil
var each = require('foreach/async')
var fs = require('lift-result/fs')
var lift = require('lift-result')
var Result = require('result')
var winner = require('winner')
var unique = require('unique')
var detect = require('detect')
var path = require('path')
var url = require('url')
var resolve = path.resolve

module.exports = Graph

// module counter
var id = 1

/**
 * the Graph class
 */

function Graph(){
  this.types = []
  this.hashReaders = []
  this.fsReaders = []
  this.graph = {}
  this.packageDirectory = 'node_modules'
}

/**
 * retrieve a file
 *
 * @param {String} base
 * @param {String} name
 * @return {Result} file
 * @api private
 */

Graph.prototype.getFile = function(base, name){
  if (/^[^.\/]/.test(name)) return fromPackage.call(this, base, name)
  return find(this.completions(resolve(base, name)), getFile)
}

function getFile(path){
  var real = fs.realpath(path)
  return new File(
    real,
    path,
    fs.stat(real),
    fs.readFile(real, 'utf8'))
}

var File = lift(function(real, path, stat, text){
  this.path = real
  if (real != path) this.alias = path
  this['last-modified'] = +stat.mtime
  this.text = text
  return this
})

/**
 * add a file and it dependencies to `this` graph
 *
 * @param {String} path
 * @return {Promise} graph
 * @api public
 */

Graph.prototype.add = function(path){
  var self = this
  return this.getFile(process.cwd(), path)
    .then(this.addFile.bind(this), function(e){
      throw e
      throw new Error('unable to get ' + path)
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
 * @api private
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
 * @api private
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
 * @api private
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
 * @api public
 */

Graph.prototype.which = function(dir, req){
  var graph = this.graph
  if (/^[^.\/]/.test(req)) return whichPackage.call(this, dir, req)
  return detect(this.completions(resolve(dir, req)), function(path){
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
 * @return {String}
 * @api private
 */

function whichPackage(dir, req){
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
 * @api public
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
 * @api public
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
 * @api private
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
 *
 * @return {this}
 * @api public
 */

Graph.prototype.clear = function(){
  id = 1
  this.graph = {}
  return this
}

/**
 * get a file from a package
 *
 * @param {String} dir
 * @param {String} name
 * @return {Result} file
 * @api private
 */

function fromPackage(dir, name){
  var ns = this.packageDirectory
  var readers = this.fsReaders
  var result = new Result
  var start = dir

  doUntil(function(loop){
    var folder = resolve(dir, ns)
    find(readers, function(fn){
      return fn(folder, name)
    }).read(write, function(){
      var again = dir == '/'
      dir = path.dirname(dir)
      loop(again)
    })
  }, error)

  function write(file){
    if (typeof file == 'object') result.write(file)
    else Result.read(getFile(file), write, error)
  }

  function error(){
    result.error(new Error('unable to resolve '+name+' from '+start))
  }

  return result
}

/**
 * look for a successful call of `ƒ`
 *
 * @param {Array} array
 * @param {Function} ƒ
 * @return {Result}
 * @api private
 */

function find(array, ƒ){
  var result = new Result
  var len = array.length
  var i = 0
  function next(e){
    if (i == len) result.error(new Error('all failed: '+e.message))
    else Result.read(ƒ(array[i], i++), function(val){
      result.write(val)
    }, next)
  }
  next()
  return result
}

Graph.readFile = getFile

/**
 * Add package resolver that operates over the filesystem
 *
 * @param {Function} fn
 * @return {this}
 * @api public
 */

Graph.prototype.addFSReader = function(fn){
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
 * @api public
 */

Graph.prototype.addHashReader = function(fn){
  assertFn(fn)
  this.hashReaders.push(fn)
  this.hashReaders = unique(this.hashReaders)
  return this
}

/**
 * Add a module definition.
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
 * @api public
 */

Graph.prototype.addType = function(type){
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
 * @api public
 */

Graph.prototype.use = function(){
  // Handle several args
  for (var i = 0, len = arguments.length; i < len; i++) {
    var name = arguments[i]
    var plug = require('./plugins/' + name + '.js')
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
