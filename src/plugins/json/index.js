var Super = require('../../Module')

exports.types = [
	{
		if: /\.json$/,
		make: Module
	}
]

function Module (file) {
	Super.call(this, file)
}

Module.prototype.requires = function () {
	return []
}