var Super = require('../../Module')

exports.types = [
	{
		if: /\.hbs$/,
		make: Module
	}
]

function Module (file) {
	Super.call(this, file)
}

/**
 * TODO: make this return a sudo file for the handle-bars runtime
 */

Module.prototype.requires = function () {
	return ['handlebars-runtime']
}