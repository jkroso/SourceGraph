exports.types = [
	Handlebars
]

function Handlebars (file) {
	this.path = file.path
	this.text = file.text
}

Handlebars.test = function (file) {
	if (file.path.match(/\.h(?:andlebars|bs)$/)) return 1
}

/**
 * TODO: make this return a sudo file for the handle-bars runtime
 */

Handlebars.prototype.requires = function () {
	return ['handlebars-runtime']
}