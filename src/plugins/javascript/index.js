var Super = require('../Module')
  , detective = require('detective')

exports.types = [
	{
		if: /\.js$/,
		make: Module
	}
]

function Module (file) {
	Super.call(this, file)
}

Module.prototype.requires = function () {
	return detective(this.text)
}