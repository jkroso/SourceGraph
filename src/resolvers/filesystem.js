var detectSeries = require('async').detectSeries,
    readFile = require('../file.js').readLocal,
    variants = require('../file.js').variants,
    pathmod = require('path'),
    fs = require('fs')

var node_core = [
    'assert', 'buffer_ieee754', 'buffer', 'child_process', 'cluster', 'console',
    'constants', 'crypto', '_debugger', 'dgram', 'dns', 'events', 'freelist',
    'fs', 'http', 'https', '_linklist', 'module', 'net', 'os', 'path',
    'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder',
    'sys', 'timers', 'tls', 'tty', 'url', 'util', 'vm', 'zlib'
].reduce(function (acc, x) { acc[x] = true; return acc }, {});

module.exports = [
    function node_modules (dir, name, done) {
        // In node core modules take priority over custom
        if (node_core[name]) {
            readFile(pathmod.resolve(__dirname, '../node_modules/'+name+'.js')).finish(done)
        } 
        else {
            var names = variants(name).map(function (name) {
                return pathmod.join(dir, 'node_modules', name)
            })
            if (!names[0].match(/\.\w+$/)) names.shift()
            names.push(pathmod.join(dir, 'node_modules', name, 'package.json'))
            detectSeries(names, fs.exists, function(winner){
                if (winner) {
                    readFile(winner).finish(done)
                } 
                else {
                    done()
                }
            })
        }
    },
    function components (dir, name, done) {
        var name = pathmod.join(dir, 'components', name, 'component.json')
        fs.exists(name, function (bool) {
            if (bool) {
                readFile(name).finish(function (file) {
                    done(file)
                })
            } 
            else {
                done()
            }
        })
    },
]
