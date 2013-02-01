exports.types = [
	Stylus
]

function Stylus (file) {
	this.path = file.path
	this.text = file.text
}

Stylus.test = function (file) {
	if (file.path.match(/\.styl$/)) return 1
}

Stylus.prototype.requires = function () {
	return []
}