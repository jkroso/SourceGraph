var Graph = require('../src')
  , prettyjson = require('prettyjson').render

/*!
 * The main file of the program
 */
var entry = __dirname + '/husband.js';

new Graph()
  .use('javascript')
	.trace(entry)
  .then(function (files) {
		files.forEach(function (file) {
			file.requires = file.requires()
		})
		console.log(prettyjson(files))
	})