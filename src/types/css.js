var JS = require('./javascript.js')

module.exports = Module
function Module (file) {
    JS.call(this, file)
}

/**
 * List all files mention in require() statements
 * @return {Array} absolute paths
 */
Module.prototype.requires = function () {
    return []
}
