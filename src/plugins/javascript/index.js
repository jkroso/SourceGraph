var detective = require('detective')

exports.types = [
	Javascript
]

function Javascript (file) {
	this.path = file.path
	this.text = file.text
}

Javascript.test = function (file) {
	if (file.path.match(/\.js$/)) return 1
}

Javascript.prototype.requires = function () {
	return detective(this.text)
}

/**
 * Determine all the paths that would have resulted in finding this file
 * 
 * @param {String} path
 * @return {Array}
 */

Javascript.completions = function (path) {
	var results = []
	
	// Is it an explicit directory
	if (path.match(/\/$/)) {
		results.push(path+'index.js')
	}
	// Did they end it without an extension
	else if (!path.match(/\.js$/)) {
		results.push(
			path+'.js', 
			path+'/index.js'
		)
	}
	else {
		results.push(path)
	}

	return results
}