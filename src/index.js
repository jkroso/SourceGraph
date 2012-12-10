require('colors')

var getExt = require('path').extname,
    joinPath = require('path').join,
    fileName = require('path').basename,
    parentDir = require('path').dirname,
    resolvePath = require('path').resolve,
    getFile = require('./file'),
    Promise = require('laissez-faire'),
    promises = require('promises'),
    all = promises.all

exports = module.exports = Graph

function log (text) {
    process.stdout.write(text)
}

// This makes Graph both a promise and an event emitter
var proto = Graph.prototype = new Promise
proto.constructor = Graph

/**
 * Generate a mapping of the entry file and all it dependencies to module objects
 * 
 * @param  {String} entry The head of your program
 * @return {Graph}        Acts as a promise for the eventual module map
 */
function Graph (entry) {
    if (!(this instanceof Graph)) return new Graph(entry)
    this.on('new-module', function (m) {
        log('New registration: '.bold.blue)
        log((parentDir(m.path)+'/').grey)
        log(fileName(m.path+'\n').blue)
    })
    this.on('load-error', function (e) {
        log('Failed registration: '.bold.red)
        log(e+'\n')
    })

    this.fileTypes = []
    this.hashResolvers = []
    this.osResolvers = []
    this._fetchs = []
    
    this.data = Object.create(null)

    entry && this.trace(entry)
}

proto.addResolver = function (os, hash) {
    return this.addOSResolver(os).addHashResolver(hash)
}

proto.addOSResolver = function (fn) {
    if (typeof fn !== 'function')
        throw new Error('OS resolver must be function')
    this.osResolvers.push(fn)
    return this
}

proto.addHashResolver = function (fn) {
    if (typeof fn !== 'function')
        throw new Error('Hash resolver must be function')
    this.hashResolvers.push(fn)
    return this
}

proto.addType = function (type) {
    if (!(type.if instanceof RegExp))
        throw new Error('File handler must have a RegExp under its `if` property')
    if (typeof type.make !== 'function')
        throw new Error('File handler must have a Function under its `make` property')
    this.fileTypes.push(type)
    return this
}

/**
 * Recursive version of proto.add
 * @param  {String}  entry Path to a file
 * @return {Promise}       For a nested array of modules
 */
proto.trace = function (entry) {
    var self = this
    this._fetchs.push(
        insert('/', entry, this).then(function trace (module) {
            var deps = module.requires()
            if (!deps.length) return module

            deps = deps.map(function (path) {
                return insert(module.base, path, self)
            })
            .filter(Boolean)
            return all(deps).then(function (modules) {
                return all(modules.filter(Boolean).map(trace))
            })
        })
    )
    return this
}

proto.then = function (done, fail) {
    var self = this
    return all(this._fetchs).then(function (d) {
        self._fetchs.length = 0
        return self.data
    }).then(done, fail).throw()
}

proto.resolve = function (base, path) {
    return resolveWithin(base, path, this)
}

function resolveWithin (base, path, graph) {
    if (path[0] !== '.' 
        && path[0] !== '/' 
        && !path.match(/^[a-zA-Z]+:/)) {
        var hash_checks = graph.hashResolvers, res
        graph = graph.data
        do {
            for ( var i = 0, len = hash_checks.length; i < len; i++ ) {
                if (res = hash_checks[i](graph, base, path)) return res
            }
        } 
        while ((base = parentDir(base)) !== '/') 
    }
    else {
        var paths = pathVariants(resolvePath(base, path))
        graph = graph.data
        for ( var i = paths.length; i-- ; ) {
            if (paths[i] in graph) return paths[i]
        }
    }
}

function insert (base, path, graph) {
    var hash = graph.data, promise

    if (typeof path === 'object')
        return Promise.fulfilled(add(path))

    if (!graph.has(base, path)) {
        return getFile(base, path, graph.osResolvers).then(add, fail)
    }

    function add (file) {
        var module = modulize(graph.fileTypes, file)
        if (module) graph.insert(module)
        else console.log('Ignoring '+file.path+' since it has no module type')
        return module
    }

    function fail (e) {
        graph.emit('load-error', path+' from '+base)
    }
}

function modulize (types, file) {
    for ( var i = 0, len = types.length; i < len; i++ ) {
        if (types[i].if.test(file.path)) 
            return new types[i].make(file)
    }
}

/**
 * Register the given file if it doesn't already exist
 * @param {String} path Full path to module
 * @return {Self}
 */
proto.add = function (path) {
    this._fetchs.push(insert('/', path, this))
    return this 
}

/**
 * Determine all the paths that would have resulted in finding this file
 * 
 * @param  {String} p a complete file path
 * @return {Array}   all path that would have found this file
 */
function pathVariants (p) {
    var results = [p]

    if (p.match(/\/$/)) results.push(
        p+'index.js'
    )
    else if (!p.match(/\.\w+$/)) results.push(
        p+'.js', 
        p+'/index.js'
    )
    
    if (p.match(/\/index\.js(?:on)?$/)) results.push(
        p.replace(/index\.js(?:on)?$/, ''),
        p.replace(/\/.*$/, '')
    )
    if (p.match(/\.js(?:on)?$/)) results.push(
        p.replace(/\.js(?:on)?$/, '')
    )

    return results
}

proto.get = function (base, path) {
    return this.data[resolveWithin(base, path, this)]
}

proto.has = function (base, path) {
    return !!resolveWithin(base, path, this)
}

proto.insert = function (module) {
    this.emit('new-module', module)
    this.data[module.path] = module
    return this
}

proto.remove = function (module) {
    delete this.data[module.path]
    return this
}

proto.write = function (where, cb) {
    require('fs').writeFile(where, JSON.stringify(this.data), 'utf-8', cb)
    return this
}