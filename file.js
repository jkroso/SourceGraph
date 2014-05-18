
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

lazy(file, 'transforms', co(function*(){
  var name = this.id
  try { var meta = yield this.meta }
  catch (_) { return [] }
  var pkg = yield meta.json
  var transforms = pkg.transpile || []
  if (this.opts && Array.isArray(this.opts.transpile)) {
    transforms = transforms.concat(this.opts.transpile)
  }
  for (var i = 0, len = transforms.length; i < len;) {
    var glob = transforms[i++]
    var mods = transforms[i++]
    if (!match(glob, name)) continue
    if (!Array.isArray(mods)) mods = [mods]
    return mods.map(function(mod){
      if (typeof mod != 'string') return mod
      if (/^!sourcegraph\/(\w+->\w+)/.test(mod)) {
        return require(__dirname + '/transforms/' + RegExp.$1)
      }
      try {
        return require(resolve(meta.id, mod))
      } catch (_) {
        throw new Error('requiring ' + mod + ' from ' + meta.id)
      }
    })
  }
  return []
}))

lazy(file, 'javascript', co(function*(){
  var mods = yield this.transforms
  if (!mods) return this.source
  var path = this.id
  return reduce(mods, function(src, fn){
    return fn(src, path)
  }, yield this.source)
}), 'enumerable')

lazy(file, 'source', function(){
  return fs.readFile(this.id, 'utf8')
}, 'enumerable')

lazy(file, 'requires', co(function*(){
  var js = yield this.javascript
  var req = unique(mine(js).map(getName))
  if (!this.opts || this.opts.env != 'node') return req
  return req.filter(function(name){
    return /^[.\/]/.test(name) || !(name in natives)
  })
}), 'enumerable')

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

lazy(MetaFile.prototype, 'requires', co(function*(){
  var pkg = yield this.json
  var res = [pkg.main || './index']
  if (pkg.extras) res = res.concat(pkg.extras)
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
