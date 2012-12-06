var JS = require('./javascript.js')

module.exports = Module
function Module (file) {
    JS.call(this, file)
}
Module.prototype.requires = function () {
    var data = JSON.parse(this.text)
    var deps = []
    var main = data.main
    if (typeof main === 'string') {
        if (main[0].match(/\w/)) main = './'+main
        deps.push(main)
    }
    return deps
}