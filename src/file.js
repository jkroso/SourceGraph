var fs = require('fs'),
    pathmod = require('path'),
    Promise = require('laissez-faire'),
    request = require('request'),
    first = require('promises').first,
    async = require('async'),
    resolveURL = require('url').resolve

exports = module.exports = function (base, path, resolvers) {
    if (isMagic(path)) 
        return getMagic(base, path, resolvers)
    else {
        if (isProtocol(path) || isAbsolute(path))
            return getFile(path)
        else if (isProtocol(base))
            return getFile(resolveURL(base, path))
        else
            return getFile(pathmod.resolve(base, path))
    }
}

function isAbsolute (p) {
    return !!p.match(/^\//)
}

function isMagic (p) {
    return !!p[0].match(/\w/) && !isProtocol(p)
}

function isProtocol (p) {
    return !!p.match(/^[a-zA-Z]+:/)
}

function getMagic (base, name, resolvers) {
    var dir = base
    var promise = new Promise
    async.doUntil(
        function (done) {
            async.series(
                resolvers.map(function (check) {
                    return function (next) {
                        check(dir, name, next)
                    }
                }),
                done
            )
        },
        function () {
            var res = dir === '/'
            dir = pathmod.dirname(dir)
            return res
        },
        function (file) {
            if (file 
                && typeof file.text === 'string'
                && typeof file['last-modified'] === 'number'
                && typeof file.path === 'string'
            )
                promise.resolve(file)
            else
                promise.reject(new Error(file || 'unable to resolve '+name+' from '+base))
        }
    )
    return promise
}

/**
 * Generate some paths to attempt
 * 
 * @param  {String} p the path
 * @return {Array}   the original path plus any others worth trying
 */
exports.variants = variants
function variants (p) {
    // Always try the path as is first
    var results = [p]
    // If its a directory
    if (p.match(/\/$/)) results.push(
        p+'index.js',
        p+'index.json'
    )
    // If no extension
    else if (!p.match(/\.\w+$/)) results.push(
        p+'.js', 
        p+'.json', 
        p+'/index.js', 
        p+'/index.json'
    )
    return results
}

/**
 * Retrieve a file from any absolute path
 * 
 * @param  {String} p e.g. http://google.com or /dev/file.js
 * @return {File}   Custom file type conbining meta data and content e.g. {last-modified:x, text:...}
 */
function getFile (p) {
    if (isProtocol(p)) {
        var files = variants(p).map(function (p) {
            var d2 = new Promise
            request.get(p, function (error, res, body) {
                if (error || res.statusCode >= 400) d2.reject(error)
                d2.resolve({
                    'path': p,
                    'text': body,
                    'last-modified': Date.parse(res.headers['last-modified']) || Date.now()
                })
            })
            return d2
        })
    }
    else {
        var files = variants(p).map(readFile)
    }
    return first(files)
}

exports.readLocal = readFile
function readFile (path) {
    var promise = new Promise
    fs.stat(path, function (e, stat) {
        if (e) return promise.reject(e)
        fs.readFile(path, 'utf-8', function (e, txt) {
            if (e) return promise.reject(e)
            promise.resolve({
                'path': path,
                'text': txt,
                'last-modified': +stat.mtime
            })
        })
    })
    return promise
}