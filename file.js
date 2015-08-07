var lift = require('lift-result/cps')
var browserResolve = lift(require('browser-resolve'))
var browserModules = require('browser-builtins')
var natives = process.binding('natives')
var toRegex = require('glob-to-regexp')
var resolve = require('resolve-module')
var detect = require('detect/series')
var reduce = require('reduce/series')
var lazy = require('lazy-property')
var fs = require('lift-result/fs')
var extend = require('extensible')
var own = Object.hasOwnProperty
var Result = require('result')
var unique = require('unique')
var map = require('map/async')
var co = require('result-co')
var mine = require('mine')
var path = require('path')
var join = path.join

function getName(obj){ return obj.name }

var isFile = co(function*(path){
  try { return (yield fs.stat(path)).isFile() }
  catch (_) { return false }
})

function match(glob, file){
  return toRegex(glob).test(file)
}

function dirs(dir){
  var res = []
  do res.push(dir = path.dirname(dir))
  while (dir != '/')
  return res
}

function File(path, cache){
  this.cache = cache || {}
  this.id = path
}

File.extend = extend

var file = File.prototype

/**
 * Reify a path as a File. If one is already in the cache
 * it will be used. Otherwise a new one will be created
 *
 * @param {String} path
 * @param {[Function]} Class
 * @return {File}
 */

file.create = function(realPath, Class){
  var file = this.cache[realPath]
  if (!(file instanceof File)) {
    Class = Class || File
    file = new Class(realPath, this.cache)
    file.opts = this.opts
    this.cache[realPath] = file
  }
  return file
}

/**
 * The known symlinks of a file
 */

lazy(file, 'aliases', Array)

/**
 * The set of transformation functions that will be applied to this file
 */

lazy(file, 'transforms', co(function*(){
  var name = this.id
  try { var meta = yield this.meta }
  catch (_) { return [] }
  var pkg = yield meta.json

  // uses sourcegraphs transform syntax
  if (pkg.transpile) {
    var transforms = pkg.transpile

    // add global transforms
    if (this.opts && Array.isArray(this.opts.transpile)) {
      transforms = transforms.concat(this.opts.transpile)
    }

    // find the first glob matching this file and
    // return the corresponding transformation functions
    for (var i = 0, l = transforms.length; i < l; i++) {
      var transform = transforms[i]
      var glob = transform[0]
      if (!match(glob, name)) continue
      var mods = transform.slice(1)
      if (!Array.isArray(mods[0])) mods = [mods]
      return mods.map(function(mod){
        var path = mod[0]
        var options = mod[1]
        if (typeof path != 'string') return path // already a function
        if (/^!sourcegraph\/(\w+->\w+)/.test(path)) {
          path = __dirname + '/transforms/' + RegExp.$1
        }
        try {
          var fn = require(resolve(meta.id, path))
        } catch (error) {
          error.message = 'while requiring ' + path + ' from ' + meta.id
                        + ': ' + error.message
          throw error
        }
        return options != null
          ? function(source){ return fn(source, options) }
          : fn
      })
    }
  }

  // useing browserify's syntax
  if (pkg.browserify && pkg.browserify.transform) {
    var mods = pkg.browserify.transform
    if (typeof mods == 'string') mods = [mods]
    return mods.map(function(mod){
      if (Array.isArray(mod)) {
        var options = mod[1]
        var mod = mod[0]
      }
      try {
        mod = require(resolve(meta.id, mod))
      } catch (error) {
        error.message = 'while requiring ' + mod + ' from ' + meta.id
                      + ': ' + error.message
        throw error
      }
      return function(src, path){
        var promise = new Result
        var stream = mod(path, options)
        var buf = ''
        stream.on('error', function(e){ promise.error(e) })
        stream.on('data', function(data){ buf += data })
        stream.on('end', function(){ promise.write(buf) })
        stream.end(src)
        return promise
      }
    })
  }

  return []
}))

/**
 * The files raw source after applying all transformations
 */

lazy(file, 'javascript', co(function*(){
  var mods = yield this.transforms
  if (!mods) return this.source
  var path = this.id
  return reduce(mods, function(src, fn){
    return fn(src, path)
  }, yield this.source)
}), 'enumerable')

/**
 * The files raw source code
 */

lazy(file, 'source', function(){
  return fs.readFile(this.id, 'utf8')
}, 'enumerable')

/**
 * The files raw dependencies as an Array of string
 */

lazy(file, 'requires', co(function*(){
  var js = yield this.javascript
  var req = unique(mine(js).map(getName))
  if (!this.opts || this.opts.env != 'node') return req
  return req.filter(function(name){
    return /^[.\/]/.test(name) || !(name in natives)
  })
}), 'enumerable')

/**
 * The files actual dependencies after apply some dependency resolution
 * logic. It ends up being an Array of absolute paths
 */

lazy(file, 'dependencies', co(function*(){
  var req = yield this.requires

  if (this.opts && this.opts.env == 'node') {
    return req.map(resolve.bind(null, this.id))
  }

  var options = {
    filename: this.id,
    modules: browserModules,
    extensions: ['.js', '.json']
  }

  return map(req, function(name){
    return browserResolve(name, options)
  })
}), 'enumerable')

/**
 * The file that defines metadata about this file. Currently only
 * package.json is supported but component.json could easily
 * be supported also
 */

lazy(file, 'meta', co(function*(){
  var self = this
  var files = dirs(this.id).map(function(dir){
    return join(dir, 'package.json')
  })
  try {
    var file = yield detect(files, function(file){
      return file in self.cache || isFile(file)
    })
  } catch (_) {
    throw new Error('couldn\'t find meta file for ' + self.id)
  }
  var real = yield fs.realpath(file)
  return this.create(real, MetaFile)
}))

/**
 * An Array of files this file depends on. As files themselves
 */

lazy(file, 'children', function(){
  var self = this
  return map(this.dependencies, function(path){
    if (path in self.cache) return self.cache[path]
    return self.cache[path] = fs.realpath(path).then(function(real){
      var file = self.create(real)
      // is symlinked
      if (real != path) {
        file.aliases.push(path)
        self.cache[path] = file
      }
      return file
    })
  })
})

/**
 * A method which converts this file to a JSON friendly format
 *
 * @return {Object}
 */

file.toJSON = co(function*(){
  var children = yield this.children
  return {
    id: this.id,
    source: yield this.javascript,
    aliases: own.call(this, 'aliases') ? this.aliases : undefined,
    deps: (yield this.requires).reduce(function(deps, name, i){
      deps[name] = children[i].id
      return deps
    }, {})
  }
})

var MetaFile = File.extend()

/**
 * Kind of a hack but provides a way to find the entry
 * file of a package
 */

lazy(MetaFile.prototype, 'requires', co(function*(){
  var pkg = yield this.json
  var res = [pkg.main || './index']
  if (pkg.extras) res = res.concat(pkg.extras)
  // normalize the paths
  return res.map(function(name){
    if (/^[^.\/]/.test(name)) return './' + name
    return name
  })
}))

lazy(MetaFile.prototype, 'json', co(function*(){
  return JSON.parse(yield this.source)
}))

lazy(MetaFile.prototype, 'javascript', co(function*(){
  return 'module.exports = ' + (yield this.source)
}))

module.exports = File
File.Meta = MetaFile
