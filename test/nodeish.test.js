
var read = require('./utils').read
var run = require('./utils').run
var chai = require('./chai')
var path = require('path')
var resolve = path.resolve
var Graph = require('..')
var fs = require('fs')

var node = require('../plugins/nodeish')

describe('hash system', function(){
	it('should return a full path', function(){
		expect(node.hashSystem('a/node_modules', 'foo', {
			"a/node_modules/foo.js": {}
		})).to.equal('a/node_modules/foo.js')
	})
})

describe('file system', function(){
	var graph
	var base = __dirname + '/fixtures/node'
	beforeEach(function(){
		graph = new Graph
		graph.use('nodeish')
		graph.use('css')
	})

	it('can include a simple npm package', function(done){
		run(graph, [
			base+'/expandsingle/index.js',
			base+'/expandsingle/node_modules/foo.js'
		]).node(done)
	})

	it('even if it isn\'t relative but has a .js on the end', function(done){
		run(graph, [
			base+'/with_extension/index.js',
			base+'/with_extension/node_modules/foo.js'
		]).node(done)
	})

	it('can include a npm package folder from an index.js', function(done){
		run(graph, [
			base+'/expandindex/index.js',
			base+'/expandindex/node_modules/foo/index.js'
		]).node(done)
	})

	it('can add a package thats lacks an index', function(done) {
		run(graph, [
			base+'/expandpackage/index.js',
			base+'/expandpackage/node_modules/foo/package.json',
			base+'/expandpackage/node_modules/foo/lib/sub.js'
		]).node(done)
	})

	it('when a dependency has a dependency it gets resolved as well', function(done) {
		run(graph, [
			base+'/hassubdependency/index.js',
			base+'/hassubdependency/node_modules/foo/index.js',
			base+'/hassubdependency/node_modules/foo/node_modules/bar/index.js'
		]).node(done)
	})

	it('when deps are mixed', function(done) {
		run(graph, [
			base+'/mixed_deps/package.json',
			base+'/mixed_deps/main.js',
			base+'/mixed_deps/node_modules/aaa/index.js',
			base+'/mixed_deps/node_modules/bbb.js',
			base+'/mixed_deps/node_modules/aaa/node_modules/ccc/index.js'
		]).node(done)
	})

	it('should resolve core modules with the lowest priority', function(done){
		run(graph, [
			base+'/core/index.js',
			base+'/core/node_modules/path.js'
		], 6).node(done)
	})

	it('should pretend core node modules are located in a global folder', function(done){
		var core = require('browser-builtins')
		graph.add(base+'/core/index.js').then(function(data) {
			data.should.have.property('/node_modules/events.js')
				.and.property('text', read(core.events))
		}).node(done)
	})

	it('should prevent duplicate dependencies being output', function(done){
		var dir = base + '/concurrent-requires/'
		run(graph, [
			dir+'index.js',
			dir+'pair-a.js',
			dir+'pair-b.js',
			dir+'pair-c.js'
		]).node(done)
	})

	it('built-in node modules', function(done){
		graph.add(base + '/built-ins.js').then(function(data) {
			data.should.include.keys(
				'/node_modules/tty.js',
				'/node_modules/assert.js',
				'/node_modules/buffer.js',
				'/node_modules/util.js'
			)
		}).node(done)
	})
})