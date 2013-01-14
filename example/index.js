var detective = require('detective')
  , path = require('path')
  , Graph = require('../src')
  , resolve = require('path').resolve
  , prettyjson = require('prettyjson').render

var entry = resolve(__dirname, 'husband.js');

new Graph()
	.addType({
		if: /\.js$/,
		make: Module
	})
	.trace(entry).then(function (files) {
		files.forEach(function (file) {
			file.requires = file.requires()
		})
		console.log(prettyjson(files))
	})



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
    this.ext = this.ext.replace(/\./, '')
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
