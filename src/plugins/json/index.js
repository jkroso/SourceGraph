exports.types = [
	Json
]

function Json (file) {
	this.text = file.text
	this.path = file.path
}

Json.test = function (file) {
	if (file.path.match(/\.json$/)) return 1
}

Json.prototype.requires = function () {
	return []
}