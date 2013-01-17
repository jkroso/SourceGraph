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
 * @return {Promise} for completion
 */

function trace (files, extra) {
	return graph.trace(files[0]).then(function(data) {
		data.should.have.a.lengthOf(files.length + (extra || 0))
		files.forEach(function (path) {
			data.should.have.property(path)
				.and.property('text', read(path, 'utf-8'))
		})
	})
}

it('should load the plugin', function () {
	var g = new Graph
	g.use('nodeish')
	g._osResolvers.should.have.a.lengthOf(1)
	g._hashResolvers.should.have.a.lengthOf(1)
	g._fileTypes.should.have.a.lengthOf(1)
})

var node = require('../src/plugins/nodeish')

describe('hashSystem', function () {
	it('should return a full path', function () {
		expect(node.hashSystem('a', 'foo', {
			"a/node_modules/foo.js": {}
		})).to.equal('a/node_modules/foo.js')
	})
})

describe('node modules magic', function () {

	beforeEach(function () {
		graph = new Graph
		graph.use('nodeish')
		graph.use('javascript')
		graph.use('json')
	})

	var base = __dirname + '/fixtures/node'

	it('can include a simple npm package', function(done) {
		var files = [
			base+'/expandsingle/index.js',
			base+'/expandsingle/node_modules/foo.js'
		]
		trace(files).nend(done)
	})

	it('even if it isn\'t relative but has a .js on the end', function (done) {
		var files = [
			base+'/with_extension/index.js',
			base+'/with_extension/node_modules/foo.js'
		]
		trace(files).nend(done)
	})

	it('can include a npm package folder from an index.js', function (done) {
		var files = [
			base+'/expandindex/index.js',
			base+'/expandindex/node_modules/foo/index.js'
		]
		trace(files).nend(done)
	})

	it('can add a package thats lacks an index', function(done) {
		var files = [
			base+'/expandpackage/index.js',
			base+'/expandpackage/node_modules/foo/package.json',
			base+'/expandpackage/node_modules/foo/lib/sub.js'
		]
		trace(files).nend(done)
	})

	it('when a dependency has a dependency it gets resolved as well', function(done) {
		var files = [
			base+'/hassubdependency/index.js',
			base+'/hassubdependency/node_modules/foo/index.js',
			base+'/hassubdependency/node_modules/foo/node_modules/bar/index.js'
		]
		trace(files).nend(done)
	})
	
	it('when deps are mixed', function(done) {
		var files = [
			base+'/mixed_deps/package.json',
			base+'/mixed_deps/main.js',
			base+'/mixed_deps/node_modules/aaa/index.js',
			base+'/mixed_deps/node_modules/bbb.js',
			base+'/mixed_deps/node_modules/aaa/node_modules/ccc/index.js'
		]
		trace(files).nend(done)
	})
	
	it('should resolve core modules with the lowest priority', function (done) {
		var files = [
			base+'/core/index.js',
			base+'/core/node_modules/path.js'
		]

		trace(files, 1).nend(done)	
	})

	it('should pretend core node modules located in a global folder', function (done) {
		var files = [
			base+'/core/index.js',
			base+'/core/node_modules/path.js'
		]

		var eventsPath = resolve(__dirname, '../src/plugins/nodeish/modules/events.js')

		graph.trace(files[0]).then(function(data) {
			data.should.have.property('/node_modules/events.js')
				.and.property('text', read(eventsPath, 'utf-8'))
		}).nend(done)
	})
	
	it('should not include unused dependencies mentioned in package.json')
})