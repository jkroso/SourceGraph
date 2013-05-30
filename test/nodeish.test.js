
var fs = require('fs')
  , path = require('path')
  , resolve = path.resolve
  , should = require('chai').should()
  , expect = require('chai').expect
  , Graph = require('..')
  , run = require('./utils').run

var graph
var node = require('../src/plugins/nodeish')

function read(path){
	return fs.readFileSync(path, 'utf-8').toString()
}

describe('hashSystem', function () {
	it('should return a full path', function () {
		expect(node.hashSystem('a/node_modules', 'foo', {
			"a/node_modules/foo.js": {}
		})).to.equal('a/node_modules/foo.js')
	})
})

describe('node modules magic', function () {
	it('should load the plugin', function () {
		var g = new Graph
		g.use('nodeish')
		g.fsReaders.should.have.a.lengthOf(1)
		g.hashReaders.should.have.a.lengthOf(1)
		g.types.should.have.a.lengthOf(3)
	})

	beforeEach(function () {
		graph = new Graph
		graph.use('nodeish')
		graph.use('css')
	})

	var base = __dirname + '/fixtures/node'

	it('can include a simple npm package', function(done) {
		var files = [
			base+'/expandsingle/index.js',
			base+'/expandsingle/node_modules/foo.js'
		]
		run(graph, files).node(done)
	})

	it('even if it isn\'t relative but has a .js on the end', function (done) {
		var files = [
			base+'/with_extension/index.js',
			base+'/with_extension/node_modules/foo.js'
		]
		run(graph, files).node(done)
	})

	it('can include a npm package folder from an index.js', function (done) {
		var files = [
			base+'/expandindex/index.js',
			base+'/expandindex/node_modules/foo/index.js'
		]
		run(graph, files).node(done)
	})

	it('can add a package thats lacks an index', function(done) {
		var files = [
			base+'/expandpackage/index.js',
			base+'/expandpackage/node_modules/foo/package.json',
			base+'/expandpackage/node_modules/foo/lib/sub.js'
		]
		run(graph, files).node(done)
	})

	it('when a dependency has a dependency it gets resolved as well', function(done) {
		var files = [
			base+'/hassubdependency/index.js',
			base+'/hassubdependency/node_modules/foo/index.js',
			base+'/hassubdependency/node_modules/foo/node_modules/bar/index.js'
		]
		run(graph, files).node(done)
	})
	
	it('when deps are mixed', function(done) {
		var files = [
			base+'/mixed_deps/package.json',
			base+'/mixed_deps/main.js',
			base+'/mixed_deps/node_modules/aaa/index.js',
			base+'/mixed_deps/node_modules/bbb.js',
			base+'/mixed_deps/node_modules/aaa/node_modules/ccc/index.js'
		]
		run(graph, files).node(done)
	})
	
	it('should resolve core modules with the lowest priority', function (done) {
		var files = [
			base+'/core/index.js',
			base+'/core/node_modules/path.js'
		]

		run(graph, files, 1).node(done)	
	})

	it('should pretend core node modules are located in a global folder', function (done) {
		var eventsPath = resolve(__dirname, '../src/plugins/nodeish/modules/events.js')
		graph.add(base+'/core/index.js').then(function(data) {
			data.should.have.property('/node_modules/events.js')
				.and.property('text', read(eventsPath))
		}).node(done)
	})

	it('should prevent duplicate dependencies being output', function (done) {
		var dir = base + '/concurrent-requires/'
		var files = [
			dir+'index.js',
			dir+'pair-a.js',
			dir+'pair-b.js',
			dir+'pair-c.js'
		]
		run(graph, files).node(done)
	})
})