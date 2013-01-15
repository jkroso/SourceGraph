var Graph = require('../src')
  , prettyjson = require('prettyjson').render

/*!
 * The main file of the program
 */
var entry = __dirname + '/husband.js';

var dirRegex = new RegExp('^'+__dirname);

new Graph()
  .use('javascript')
	.trace(entry)
  .then(function (files) {
		files.forEach(function (file) {
			file.requires = file.requires()
			file.base = file.base.replace(dirRegex, '')
			file.path = file.path.replace(dirRegex, '')
		})
		console.log(prettyjson(files))
	})