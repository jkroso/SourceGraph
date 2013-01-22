var fs = require('fs')
  , path = require('path')

/*!
 * Note: it would be nice to intercept the request for index.js before its made 
 * and make the switch there.
 */

exports.types = [
	MochaJS
]

/**
 * Module constructor
 * We need to ensure that it makes no require calls since this is actually a
 * prebuilt version that comes with mocha. Their build is very complicated so
 * its easier just to cheat in this way.
 */

function MochaJS (file) {
	// Read the build file instead of the index file
	// Note the path to this module will remain index.js it just
	// that we switch the contents of that file for that from their
	// browser build
	this.path = '/node_modules/mocha/index.js'
	try {
		this.text = fs.readFileSync(path.dirname(file.path) + '/mocha.js', 'utf-8')
	} catch (e) {
		throw new Error('Problem reading mocha\'s browser build')
	}
	// The mocha browser build exports a global so we grab that
	this.text +='\nmodule.exports = mocha'
}

MochaJS.test = function (file) {
	if (file.path.match(/\/node_modules\/mocha\/index\.js$/)) return 10
}

MochaJS.prototype.requires = function () {
	return []
}