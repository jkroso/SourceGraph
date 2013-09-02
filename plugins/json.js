exports.types = [
	Json
]

function Json(file){
	this.text = file.text
	this.path = file.path
}

Json.test = function(file){
	if (file.path.match(/\.json$/)) return 1
}

Json.prototype.requires = function(){
	return []
}

/**
 * suggest completions for `path`
 *
 * @param {String} path
 * @return {Array}
 */

Json.completions = function(path){
	var results = []

	// Is it an explicit directory
	if (path.match(/\/$/)) {
		results.push(path+'index.json')
	}
	// Did they end it without an extension
	else if (!path.match(/\.json$/)) {
		results.push(
			path+'.json',
			path+'/index.json'
		)
	} else {
		results.push(path)
	}

	return results
}