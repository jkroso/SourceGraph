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
			file.base = file.base.replace(dirRegex, '')
			file.path = file.path.replace(dirRegex, '')
			file.children = file.children.map(function (path) {
				return path.replace(dirRegex, '')
			})
			file.parents = file.parents.map(function (path) {
				return path.replace(dirRegex, '')
			})
		})
		console.log(prettyjson(files))
	})