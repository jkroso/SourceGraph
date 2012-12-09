var detective = require('detective'),
    path = require('path')

module.exports = Module

/**
 * Represents a module
 * @param {Object} a file object
 */
function Module (file) {
    var location = file.path
    this.path = location
    this.base = path.dirname(location)
    this.ext = path.extname(location)
    this.name = path.basename(location, this.ext)
    this.text = file.text
    this.lastModified = file['last-modified']
}

/**
 * List all files mention in require() statements
 * @return {Array} absolute paths
 */
Module.prototype.requires = function () {
    return detective(this.text)
}
