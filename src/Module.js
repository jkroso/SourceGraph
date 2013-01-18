var path = require('path')
  , dirname = path.dirname
  , extname = path.extname
  , basename = path.basename

module.exports = Module

/**
 * Represents a module
 * @param {Object} a file object
 */

function Module (file) {
	var location = file.path
	this.path = location
	this.base = dirname(location)
	this.ext = extname(location)
	this.name = basename(location, this.ext)
	this.ext = this.ext.replace(/^\./, '')
	this.text = file.text
	this.lastModified = file['last-modified']
}

/**
 * List all files mention in require() statements
 * @return {Array} absolute paths
 */

Module.prototype.requires = function () {
	return []
}
