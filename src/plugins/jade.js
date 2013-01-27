var read = require('fs').readFileSync

var runtime = {
	path: '/node_modules/jade-runtime.js',
	text: read(require.resolve('jade/lib/runtime'), 'utf-8')
}

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
	return [runtime]
}