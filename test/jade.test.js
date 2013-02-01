var fs = require('fs')
  , read = fs.readFileSync
  , path = require('path')
  , resolve = path.resolve
  , should = require('chai').should()
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

var root = resolve(__dirname, './fixtures/jade')+'/'

describe('jade plugin', function () {
	it('can load the plugin', function () {
		var g = new Graph
		g.use('jade')
		g._osResolvers.should.have.a.lengthOf(0)
		g._hashResolvers.should.have.a.lengthOf(0)
		g._types.should.have.a.lengthOf(1)
	})

	beforeEach(function () {
		graph = new Graph().use('javascript', 'jade')
	})
	
	it('should require the runtime', function (done) {
		var files = [
			root+'tmpl.jade'
		]
		trace(files).nend(done)
	})

	it('should load children in require statements', function (done) {
		var files = [
			root+'dep.jade',
			root+'tmpl.jade'
		]
		trace(files).nend(done)		
	})
})