exports.types = [
	Jade
]

function Jade (file) {
	this.path = file.path
	this.text = file.text
}

Jade.test = function (file) {
	if (file.path.match(/\.jade$/)) return 1
}

Jade.prototype.requires = function () {
	var requires = []
	this.text.replace(/^require\s*(.+)/mg, function (_, req) {
		requires.push(req)
	})
	return requires
}