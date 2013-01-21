exports.types = [
	CSS
]

function CSS (file) {
	this.path = file.path
	this.text = file.text
}

/**
 * TODO: do it properly
 */
CSS.prototype.requires = function () {
	return []
}

CSS.test = function (file) {
	if (file.path.match(/\.css$/)) {
		return 1
	}
}

/**
 * Determine all the paths that would have resulted in finding this file
 * 
 * @param {String} path
 * @return {Array}
 */

CSS.completions = function (path) {
	var results = []
	
	// Is it an explicit directory
	if (path.match(/\/$/)) {
		results.push(path+'index.css')
	}
	// Did they end it without an extension
	else if (!path.match(/\.css$/)) {
		results.push(
			path+'.css', 
			path+'/index.css'
		)
	}
	else {
		results.push(path)
	}

	return results
}