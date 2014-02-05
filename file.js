
var lift = require('lift-result')
var browserModules = require('browser-builtins')
var browserResolve = require('browser-resolve')
var natives = process.binding('natives')
var toRegex = require('glob-to-regexp')
var resolve = require('resolve-module')
var detect = require('detect/series')
var reduce = require('reduce/series')
var filter = require('filter/async')
var lazy = require('lazy-property')
var fs = require('lift-result/fs')
var extend = require('extensible')
var own = Object.hasOwnProperty
var unique = require('unique')
var Result = require('result')
var map = require('map/async')
var mine = require('mine')
var path = require('path')
var unbox = Result.unbox
var when = Result.when
var join = path.join

var requires = lift(function(js){
  return mine(js).map(function(r){ return r.name })
})

function File(path, cache){
  this.cache = cache || {}
  this.id = path
}

File.extend = extend

var file = File.prototype

file.create = function(real, Class){
  var file = this.cache[real]
  if (!(file instanceof File)) {
    Class = Class || File
    file = new Class(real, this.cache)
    file.opts = this.opts
    this.cache[real] = file
  }
  return file
}

lazy(file, 'aliases', Array)

lazy(file, 'transforms', function(){
  var name = this.id
  var opts = this.opts
  return when(this.meta, function(meta){
    return when(meta.json, function(pkg){
      var transforms = pkg.transpile || []
      if (opts && Array.isArray(opts.transpile)) {
        transforms = transforms.concat(opts.transpile)
      }
      for (var i = 0, len = transforms.length; i < len;) {
        var glob = transforms[i++]
        var mods = transforms[i++]
        if (!match(glob, name)) continue
        if (!Array.isArray(mods)) mods = [mods]
        return mods.map(function(mod){
          if (typeof mod != 'string') return mod
          return require(resolve(name, mod))
        })
      }
      return []
    })
  })
})

lazy(file, 'javascript', function(){
  var mods = this.transforms
  var path = this.id
  return when(this.source, function(src){
    return when(mods, function(mods){
      if (!mods) return src
      return reduce(mods, function(src, fn){
        return fn(src, path)
      }, src)
    })
  })
}, 'enumerable')

lazy(file, 'source', function(){
  return fs.readFile(this.id, 'utf8')
}, 'enumerable')

lazy(file, 'requires', function(){
  var req = when(requires(this.javascript), unique)
  if (this.opts && this.opts.env == 'node') {
    req = filter(req, function(name){
      return /^[.\/]/.test(name) || !(name in natives)
    }, this)
  }
  return req
}, 'enumerable')

lazy(file, 'dependencies', function(){
  var path = this.id

  if (this.opts && this.opts.env == 'node') {
    return map(this.requires, function(name){
      return resolve(path, name)
    })
  }

  var options = {
    filename: path,
    modules: browserModules,
    extensions: ['.js', '.json']
  }

  return map(this.requires, function(name){
    var result = new Result
    browserResolve(name, options, function(e, path){
      if (e) result.error(e)
      else result.write(path)
    })
    return result
  })
}, 'enumerable')

lazy(file, 'meta', function(){
  var self = this
  var files = parents(path.dirname(this.id)).map(function(dir){
    return join(dir, 'package.json')
  })
  var file = detect(files, function(file){
    return file in self.cache || isFile(file)
  })
  return file
    .then(fs.realpath, function(){
      throw new Error('couldn\'t find meta file for ' + self.id)
    })
    .then(function(real){
      return self.create(real, MetaFile)
    })
})

lazy(file, 'children', function(){
  var self = this
  return map(this.dependencies, function(path){
    if (path in self.cache) return self.cache[path]
    return self.cache[path] = fs.realpath(path).then(function(real){
      var file = self.create(real)
      // symlink
      if (real != path) {
        file.aliases.push(path)
        self.cache[path] = file
      }
      return file
    })
  })
})

file.toJSON = function(){
  var children = unbox(this.children)
  return {
    id: this.id,
    source: unbox(this.javascript),
    aliases: own.call(this, 'aliases') ? this.aliases : undefined,
    deps: unbox(this.requires).reduce(function(deps, name, i){
      deps[name] = children[i].id
      return deps
    }, {})
  }
}

var MetaFile = File.extend()

lazy(MetaFile.prototype, 'requires', function(){
  return when(this.json, function(pkg){
    var res = [pkg.main || './index']
    if (pkg.extras) res = res.concat(pkg.extras)
    return res.map(function(name){
      if (/^[^.\/]/.test(name)) return './' + name
      return name
    })
  })
})

lazy(MetaFile.prototype, 'json', function(){
  return when(this.source, JSON.parse)
})

lazy(MetaFile.prototype, 'javascript', function(){
  return when(this.source, function(src){
    return 'module.exports = ' + src
  })
})

function match(glob, file){
  return toRegex(glob).test(file)
}

function isFile(path){
  return fs.stat(path).then(function(stat){
    return stat.isFile()
  }, no)
}

function no(){ return false }

function parents(dir){
  var res = [dir]
  do res.push(dir = path.dirname(dir))
  while (dir != '/')
  return res
}

/**
 * expose File
 */

module.exports = exports = File
exports.Meta = MetaFile
