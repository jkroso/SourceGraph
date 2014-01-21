
var lift = require('lift-result')
var browserModules = require('browser-builtins')
var browserResolve = require('browser-resolve')
var requires = lift(require('detective'))
var toRegex = require('glob-to-regexp')
var resolve = require('resolve-module')
var detect = require('detect/series')
var reduce = require('reduce/series')
var lazy = require('lazy-property')
var fs = require('lift-result/fs')
var extend = require('extensible')
var own = Object.hasOwnProperty
var unique = require('unique')
var Result = require('result')
var map = require('map/async')
var path = require('path')
var when = Result.when
var join = path.join

module.exports = File

function File(path){
  this.path = path
}

File.extend = extend
File.cache = Object.create(null)
File.create = function(real){
  return this.cache[real] || (this.cache[real] = new this(real))
}

lazy(File.prototype, 'aliases', Array)

lazy(File.prototype, 'transforms', function(){
  var name = this.path
  return when(this.meta, function(meta){
    return when(meta.json, function(pkg){
      var transforms = pkg.transpile || []
      for (var i = 0, len = transforms.length; i < len;) {
        var glob = transforms[i++]
        var mods = transforms[i++]
        if (!match(glob, name)) continue
        if (typeof mods == 'string') mods = [mods]
        return mods.map(resolve.bind(null, path.dirname(name)))
      }
      return []
    })
  })
})

lazy(File.prototype, 'javascript', function(){
  var mods = this.transforms
  var path = this.path
  return when(this.source, function(src){
    return when(mods, function(mods){
      if (!mods) return src
      return reduce(mods, function(src, mod){
        if (typeof mod == 'string') mod = require(mod)
        return mod(src, path)
      }, src)
    })
  })
}, 'enumerable')

lazy(File.prototype, 'source', function(){
  return fs.readFile(this.path, 'utf8')
})

lazy(File.prototype, 'requires', function(){
  return when(requires(this.javascript), unique)
}, 'enumerable')

lazy(File.prototype, 'dependencies', function(){
  var base = path.dirname(this.path)
  var opts = {filename: this.path, modules: browserModules}
  return map(this.requires, function(name){
    var result = new Result
    browserResolve(name, opts, function(e, path){
      if (e) result.error(e)
      else result.write(path)
    })
    return result
  })
}, 'enumerable')

lazy(File.prototype, 'meta', function(){
  var files = parents(path.dirname(this.path)).map(function(dir){
    return join(dir, 'package.json')
  })
  var file = detect(files, function(file){
    return file in File.cache || isFile(file)
  })
  return file
    .then(fs.realpath)
    .then(MetaFile.create)
})

lazy(File.prototype, 'children', function(){
  return map(this.dependencies, function(path){
    if (path in File.cache) return File.cache[path]
    return fs.realpath(path).then(function(real){
      var file = File.create(real)
      if (real != path) {
        file.aliases.push(path)
        File.cache[path] = file
      }
      return file
    })
  })
})

File.prototype.toJSON = function(){
  var resolved = this.children.value
  return {
    source: this.source.value,
    id: this.path,
    deps: this.requires.value.reduce(function(deps, name, i){
      deps[name] = resolved[i].path
      return deps
    }, {}),
    aliases: own.call(this, 'aliases') ? this.aliases : undefined
  }
}

var MetaFile = File.extend()
MetaFile.create = File.create.bind(MetaFile)

lazy(MetaFile.prototype, 'requires', function(){
  return when(this.json, function(pkg){
    var res = [pkg.main || './index']
    if (pkg.extras) res = res.concat(pkg.extras)
    return res
  })
})

lazy(MetaFile.prototype, 'json', function(){
  return when(this.source, JSON.parse)
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
