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

    // Copy the extension points so they can be safely over-ridden
    this.types = require('./types').slice()
    this.hashResolvers = require('./resolvers/hash.js').slice()
    this.osResolvers = require('./resolvers/filesystem.js').slice()
    this._fetchs = []
    
    this.data = Object.create(null)

    entry && this.trace(entry)
}

proto.addResolver = function (os, hash) {
    this.osResolvers.push(os)
    this.hashResolvers.push(hash)
    return this
}

proto.addType = function (type) {
    this.types.push(type)
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

function insert (base, path, graph) {
    var hash = graph.data, promise

    if (typeof path === 'object')
        return Promise.fulfilled(add(path))

    if (!has(base, path)) {
        return getFile(base, path, graph.osResolvers).then(add, fail)
    }

    function add (file) {
        var module = modulize(graph.types, file)
        if (module) graph.insert(module)
        else {debugger;console.log('Ignoring '+file.path+' since it has no module type')}
        return module
    }

    function fail (e) {
        graph.emit('load-error', path+' from '+base)
    }
    
    function has (dir, name) {
        if (name[0] !== '.' 
            && name[0] !== '/' 
            && !name.match(/^[a-zA-Z]+:/)) {
            var hash_checks = graph.hashResolvers
            do {
                for ( var i = 0, len = hash_checks.length; i < len; i++ ) {
                    if (hash_checks[i](hash, dir, name)) return true
                }
            } while ((dir = parentDir(dir)) !== '/') 
            return false
        }
        else {
            return graph.has(resolvePath(dir, name))
        }
    }
}

function modulize (types, file) {
    for ( var i = 0, len = types.length; i < len; i++ ) {
        if (types[i].re.test(file.path)) 
            return new types[i].constructor(file)
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

proto.get = function (p) {
    var paths = pathVariants(p),
        i = paths.length
    while (i--) {
        if (paths[i] in this.data) return this.data[paths[i]]
    }
}

proto.has = function (p) {
    var paths = pathVariants(p)
    for ( var i = paths.length; i-- ; ) {
        if (paths[i] in this.data) return true
    }
    return false
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