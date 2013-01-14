var fs = require('fs')
, read = fs.readFileSync
, path = require('path')
, resolve = path.resolve
, assert = require('chai').assert
, should = require('chai').should()
, Graph = require('../src')

var graph

// prepare the graph so standart behaviour.
// Out the gate it doesn't even know how to handle JS
beforeEach(function () {
	graph = new Graph
	require('./types').forEach(function(type){
		graph.addType(type)
	})
	require('./resolvers/filesystem').forEach(function (fn) {
		graph.addOSResolver(fn)
	})
	require('./resolvers/hash').forEach(function (fn) {
		graph.addHashResolver(fn)
	})
})

describe('add(path)', function () {
	var base = __dirname + '/fixtures/simple'
	var p1 = base+'/index.js'
	var p2 = base+'/has_dependency.js'
	
	it('will simply fetch the file and include it', function (done) {
		graph.add(p2).then(function (files) {
			files.should.have.a.lengthOf(1)
			files[0].text.should.equal(read(p2, 'utf-8').toString())
			done()
		})
	})

	it('can load several files', function (done) {
		graph.add(p1).add(p2).then(function (files) {
			files.should.have.a.lengthOf(2)
			files[p1].text.should.equal(read(p1, 'utf-8'))
			files[p2].text.should.equal(read(p2, 'utf-8'))
			done()
		})
	})
})

describe('trace(path)', function () {
	var base = __dirname + '/fixtures/simple'
	var p1 = base+'/index.js'
	var p2 = base+'/has_dependency.js'
	
	it('will automatically trace dependencies', function (done) {
		graph.trace(p2).then(function (files) {
			files.should.have.a.lengthOf(2)
			files[p1].text.should.equal(read(p1, 'utf-8'))
			files[p2].text.should.equal(read(p2, 'utf-8'))
			done()
		})
	})
})

it('can define custom handlers', function(done) {
	var p = __dirname + '/fixtures/non_js/example.rndom'
	graph.addType({
			if: /\.rndom$/,
			make: function (file) {
				require('./types/javascript.js').call(this, file)
				this.requires = function () {
					return []
				}
			}
		})
		.trace(p)
		.then(function (data) {
			should.exist(data[p])
			data[p].text.should.equal(read(p, 'utf-8'))
			done()
		})
		.throw()
})

describe('Loading with protocols (e.g. http:)', function () {
	var p = 'https://raw.github.com/jkroso/Emitter/master/src/index.js'
	
	it('simple one file case', function (done) {
		graph.add(p).then(function (files) {
			files.should.have.a.lengthOf(1)
			files[0].path.should.equal(p)
			files[0].text.should.include('emitter')
		}).nend(done)
	})
})

describe('npm magic', function () {
	var base = __dirname + '/fixtures/node'

	it('can include a simple npm package', function(done) {
		var p = base+'/expandsingle/index.js'
		var n = base+'/expandsingle/node_modules/foo.js'
		
		graph.trace(p).then(function(data) {
			data.should.have.a.lengthOf(2)
			data[p].text.should.equal(read(p, 'utf-8'))
			data[n].text.should.equal(read(n, 'utf-8'))
		}).nend(done)
	})

	it('even if it isn\'t relative but has a .js on the end', function (done) {
		var p = base+'/with_extension/index.js'
		var n = base+'/with_extension/node_modules/foo.js'

		graph.trace(p).then(function(data) {
			data.should.have.a.lengthOf(2)
			data[p].text.should.equal(read(p, 'utf-8'))
			data[n].text.should.equal(read(n, 'utf-8'))
		}).nend(done)
	})

	it('can include a npm package folder from an index.js', function (done) {
		var p = base+'/expandindex/index.js'
		var n = base+'/expandindex/node_modules/foo/index.js'
		
		graph.trace(p).then(function(data) {
			data.should.have.a.lengthOf(2)
			data[p].text.should.equal(read(p, 'utf-8'))
			data[n].text.should.equal(read(n, 'utf-8'))
		}).nend(done)
	})

	it('can add a dependency on a package that is a directory (package.json)', function(done) {
		var p = base+'/expandpackage/index.js'
		var n1 = base+'/expandpackage/node_modules/foo/package.json'
		var n2 = base+'/expandpackage/node_modules/foo/lib/sub.js'

		graph.trace(p).then(function(data) {
			data.should.have.a.lengthOf(3)
			data[p].text.should.equal(read(p, 'utf-8'))
			data[n1].text.should.equal(read(n1, 'utf-8'))
			data[n2].text.should.equal(read(n2, 'utf-8'))
		}).nend(done)
	})

	it('when a dependency has a dependency it gets resolved as well', function(done) {
		var p = base+'/hassubdependency/index.js'
		var n1 = base+'/hassubdependency/node_modules/foo/index.js'
		var n2 = base+'/hassubdependency/node_modules/foo/node_modules/bar/index.js'
		
		graph.trace(p).then(function(data) {
			data.should.have.a.lengthOf(3)
			data[p].text.should.equal(read(p, 'utf-8'))
			data[n1].text.should.equal(read(n1, 'utf-8'))
			data[n2].text.should.equal(read(n2, 'utf-8'))
		}).nend(done)
	})
	
	it('when deps are mixed', function(done) {
		var p = base+'/mixed_deps/package.json'
		var n1 = base+'/mixed_deps/main.js'
		var n2 = base+'/mixed_deps/node_modules/aaa/index.js'
		var n3 = base+'/mixed_deps/node_modules/bbb.js'
		var n4 = base+'/mixed_deps/node_modules/aaa/node_modules/ccc/index.js'
		
		graph.trace(p).then(function(data) {
			data.should.have.a.lengthOf(5)
			data[p].text.should.equal(read(p, 'utf-8'))
			data[n1].text.should.equal(read(n1, 'utf-8'))
			data[n2].text.should.equal(read(n2, 'utf-8'))
			data[n3].text.should.equal(read(n3, 'utf-8'))
			data[n4].text.should.equal(read(n4, 'utf-8'))
		}).nend(done)
	})
	
	it('should resolve core modules with the lowest priority', function (done) {
		var p = base+'/core/index.js'
		var n1 = base+'/core/node_modules/path.js'
		var n2 = resolve(__dirname, '../src/node_modules/events.js')
		
		graph.trace(p).then(function(data) {
			data.should.have.a.lengthOf(3)
			data[p].text.should.equal(read(p, 'utf-8'))
			data[n1].text.should.equal(read(n1, 'utf-8'))
			data[n2].text.should.equal(read(n2, 'utf-8'))
		}).nend(done)
	})
	
	it('should not include unused dependencies mentioned in package.json')
})

describe('component/component magic', function () {
	var root = resolve(__dirname, './fixtures/cc')+'/'
	
	it('should handle a simple case where component.json requires one script file', function (done) {
		var paths = [
			root+'simple/component.json',
			root+'simple/index.js'
		]
		graph.trace(paths[0]).then(function(data) {
			data.should.have.a.lengthOf(paths.length)
			paths.forEach(function (path) {
				data[path].text.should.equal(read(path, 'utf-8'))
			})
			done()
		})
	})
	
	it('can include another component', function (done) {
		var paths = [
			root+'with_dep/component.json',
			root+'components/component-inherit/component.json',
			root+'components/component-inherit/index.js'
		]
		graph.trace(paths[0]).then(function(data) {
			data.should.have.a.lengthOf(paths.length+2)
			paths.forEach(function (path) {
				data[path].text.should.equal(read(path, 'utf-8'))
			})
			var dep = root+'with_dep/components/inherit'
			data[dep].text.should.equal('module.exports = require("component-inherit")')
		}).nend(done)
	})
	
	it('can include multiple components', function (done) {
		var paths = [
			resolve(__dirname, './fixtures/cc/with_deps/component.json'),
			resolve(__dirname, './fixtures/cc/components/animal/component.json'),
			resolve(__dirname, './fixtures/cc/components/animal/index.js'),
			resolve(__dirname, './fixtures/cc/components/component-inherit/component.json'),
			resolve(__dirname, './fixtures/cc/components/component-inherit/index.js'),
		];
		graph.trace(paths[0]).then(function(data) {
			data.should.have.a.lengthOf(paths.length+3)
			paths.forEach(function (path) {
				data[path].text.should.equal(read(path, 'utf-8'))
			})
		}).nend(done)
	})
})

it('Kitchen sink', function (done) {
	var base = __dirname+'/fixtures/kitchen'
	var paths = [
			base+'/index.js',
			base+'/tip.htempl',
			base+'/Subscription.js',
			base+'/components/component-tip/component.json',
			base+'/components/component-tip/index.js',
			base+'/components/component-tip/template.js',
			base+'/components/component-tip/tip.css',
			base+'/components/component-jquery/component.json',
			base+'/components/component-jquery/index.js',
			base+'/components/component-emitter/component.json',
			base+'/components/component-emitter/index.js',
		];

		graph.addType({
				if: /\.htempl$/,
				make: function (file) {
					require('./types/javascript.js').call(this, file)
					this.requires = function () {
						return []
					}
				}
			})
			.trace(paths[0])
			.add(paths[1])
			.then(function(data) {
				data.should.have.a.lengthOf(paths.length+6)
				paths.forEach(function (p) {
					data[p].text.should.equal(read(p, 'utf-8'))
				})
				var n1 = __dirname+'/node_modules/path.js'
				data[n1].text.should.equal(read(n1, 'utf-8'))
			}).nend(done)
})
