var JS = require('./javascript.js')

module.exports = Module
function Module (file) {
    JS.call(this, file)
}
Module.prototype.requires = function () {
    return ['handlebars']
}
