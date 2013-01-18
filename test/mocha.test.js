var fs = require('fs')
  , read = fs.readFileSync
  , path = require('path')
  , resolve = path.resolve
  , should = require('chai').should()
  , expect = require('chai').expect
  , Graph = require('../src')

var graph

/**
 * Helper for checking graphs creating graphs and checking 
 * they contain what they should
 *
 * @param {Array} files, the first path should be the entry file
 * @param {Number} sudos the number of sudo files you expect to of been created
 * @return {Promise} for completion
 */

function trace (files, sudos) {
	return graph.trace(files[0]).then(function(data) {
		data.should.have.a.lengthOf(files.length + (sudos || 0))
		files.forEach(function (path) {
			data.should.have.property(path)
				.and.property('text', read(path, 'utf-8'))
		})
		return data
	})
}

var root = resolve(__dirname, './fixtures/node/test-suite')+'/'
var top = resolve(__dirname, '..')

describe('mocha plugin', function () {
	it('can load the plugin', function () {
		var g = new Graph
		g.use('mocha')
		g._osResolvers.should.have.a.lengthOf(0)
		g._hashResolvers.should.have.a.lengthOf(0)
		g._fileTypes.should.have.a.lengthOf(1)
	})

	beforeEach(function () {
		graph = new Graph().use('mocha', 'javascript', 'nodeish')
	})
	
	it('should use the pre-built version of mocha but pretend its the normal one', function (done) {
		var files = [
			root+'test/browser.js',
			root+'test/index.test.js',
			root+'src/index.js'
		]
		trace(files, 1)
		.then(function (files) {
			var built = top+'/node_modules/mocha/mocha.js'
			files.should.have.property(top+'/node_modules/mocha/index.js')
				.and.property('text', read(built, 'utf-8')+'\nmodule.exports = mocha')
		})
		.nend(done)
	})
})