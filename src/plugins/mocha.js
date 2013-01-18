var Super = require('../Module')
  , fs = require('fs')

/*!
 * Note: it would be nice to intercept the request for index.js before its made 
 * and make the switch there.
 */

exports.types = [
	{
		if: /\/node_modules\/mocha\/index\.js$/,
		make: Mocha
	}
]

/**
 * Module constructor
 * We need to ensure that it makes no require calls since this is actually a
 * prebuilt version that comes with mocha. Their build is very complicated so
 * its easier just to cheat in this way.
 */

function Mocha (file) {
	Super.call(this, file)
	// Read the build file instead of the index file
	// Note the path to this module will remain index.js it just
	// that we switch the contents of that file for that from their
	// browser build
	try {
		this.text = fs.readFileSync(this.base + '/mocha.js', 'utf-8')
	} catch (e) {
		throw new Error('Problem reading mocha\'s browser build')
	}
	// The mocha browser build exports a global so we grab that
	this.text +='\nmodule.exports = mocha'
}

Mocha.prototype.__proto__ = Super.prototype