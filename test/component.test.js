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

var root = resolve(__dirname, './fixtures/cc')+'/'

it('can load the component plugin', function () {
	var g = new Graph
	g.use('component')
	g._osResolvers.should.have.a.lengthOf(1)
	g._hashResolvers.should.have.a.lengthOf(1)
	g._fileTypes.should.have.a.lengthOf(2)
})

var component = require('../src/plugins/component')

describe('hashSystem', function () {
	it('should return a full path', function () {
		expect(component.hashSystem('a', 'foo', {
			"a/components/foo": {}
		})).to.equal('a/components/foo')
	})
})

describe('component/component magic', function () {
	beforeEach(function () {
		graph = new Graph().use('component', 'javascript')
	})
	
	it('should include files under the scripts property', function (done) {
		var files = [
			root+'simple/component.json',
			root+'simple/index.js'
		]
		trace(files).nend(done)
	})
	
	it('can include another component', function (done) {
		var files = [
			root+'with_dep/component.json',
			root+'with_dep/index.js',
			root+'components/component-inherit/component.json',
			root+'components/component-inherit/index.js'
		]

		trace(files, 1).then(function(data) {
			// Check the sudo file was created correctly
			data.should.have.property(root+'with_dep/components/inherit')
				.and.property('text', 'module.exports = require("component-inherit")')
		}).nend(done)
	})
	
	it('can include multiple components', function (done) {
		var files = [
			root + 'with_deps/component.json',
			root + 'components/animal/component.json',
			root + 'components/animal/index.js',
			root + 'components/component-inherit/component.json',
			root + 'components/component-inherit/index.js',
		]
		// Should end up with three aliases
		trace(files, 3).nend(done)
	})
})