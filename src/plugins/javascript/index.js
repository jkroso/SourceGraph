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