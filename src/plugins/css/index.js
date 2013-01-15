var Super = require('../Module')

exports.types = [
	{
		if: /\.css$/,
		make: Module
	}
]

function Module (file) {
	Super.call(this, file)
}

Module.prototype.requires = function () {
	return []
}