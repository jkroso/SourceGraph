
exports.types = [ CSS ]

function CSS(file){
	this.path = file.path
	this.text = file.text
}

/**
 * TODO: do it properly
 */

CSS.prototype.requires = function(){
	return []
}

CSS.test = function(file){
	if (file.path.match(/\.css$/)) {
		return 1
	}
}
