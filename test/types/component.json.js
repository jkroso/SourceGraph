var JS = require('./javascript.js'),
    join = require('path').join

module.exports = Module
function Module (file) {
    JS.call(this, file)
}
Module.prototype.requires = function () {
    var data = JSON.parse(this.text)
    var deps = []
    data.dependencies && Object.keys(data.dependencies).forEach(function (dep) {
        var fullname = dep.replace(/\//g, '-')
        deps.push(fullname)
        // Create an alias just for the current base or lower
        deps.push({
            path: join(this.base, 'components', dep.split('/')[1] || dep.split('/')[0]),
            text: 'module.exports = require("'+fullname+'")',
            'last-modified': Date.now()
        })
    }, this)

    // Method A let the index require the rest
    // var main = data.main
    // if (typeof main === 'string') {
    //     if (main[0].match(/\w/)) main = './'+main
    // }
    // else {
    //     if (!data.scripts) throw new Error('Unable to determine main file for '+ this.path)
    //     data.scripts.forEach(function (path) {
    //         if (path.match(/index\.js$/)) {
    //             if (path[0].match(/\w/)) path = './'+path
    //             main = path
    //             return true
    //         }
    //     })
    // }
    // deps.push(main)

    // Method B include all up front
    data.scripts && data.scripts.forEach(function (path) {
        if (path[0].match(/\w/)) path = './'+path
        deps.push(path)
    }, this)
    data.styles && data.styles.forEach(function (path) {
        if (path[0].match(/\w/)) path = './'+path
        deps.push(path)
    }, this)
    
    return deps
}