var fs = require('fs')
, read = fs.readFileSync
, path = require('path')
, resolve = path.resolve
, should = require('chai').should()
, Graph = require('../src')
, all = require('when-all')
, file = require('../src/file')

var graph

// prepare the graph so standart behaviour.
// Out the gate it doesn't even know how to handle JS
beforeEach(function () {
	graph = new Graph().use('nodeish', 'component', 'javascript', 'json', 'css')
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

describe('getFile(base, path)', function (get) {
	var jquery = 'http://code.jquery.com/jquery-1.8.0.js'
	var localjq = __dirname+'/fixtures/jquery-1.8.0.js'
	var jqHost = jquery.replace(/\/[^\/]*$/, '')
	var cachJQ = file.remote(jquery)

	it('should fetch a local file', function (done) {
		var base = __dirname + '/fixtures/simple'
		graph.getFile(base, './index.js').then(function (file) {
			file.path.should.equal(base+'/index.js')
		}).nend(done)
	})

	it('should fetch an absolute url from a remote base', function (done) {
		graph.getFile(jqHost, jquery).then(function (file) {
			file.path.should.equal(jquery)
		}).nend(done)
	})
	
	it('should fetch a relative path from a url base', function (done) {
		all([
			graph.getFile(jqHost, './jquery-1.8.0.js'),
			cachJQ
		]).then(function (files) {
			files[0].should.deep.equal(files[1])
		}).nend(done)
	})

	it('should fetch a remote url from a local base', function (done) {
		graph.getFile('/', jquery).then(function (resolved) {
			return cachJQ.then(function (file) {
				file.should.deep.equal(resolved)
			})
		}).nend(done)
	})

	it('should fetch an absolute local path from a url base', function (done) {
		graph.getFile(jqHost, __dirname+'/node_modules/package').then(function (resolved) {
			return file.local(__dirname+'/node_modules/package/index.js').then(function (file) {
				file.should.deep.equal(resolved)
			})
		}).nend(done)
	})
	
	it('should resolve a node package from a local base', function (done) {
		graph.getFile(__dirname, 'file.js').then(function (resolved) {
			return file.local(__dirname+'/node_modules/file.js').then(function (file) {
				file.should.deep.equal(resolved)
			})
		}).nend(done)
	})

	it('should resolve a component from a local path', function (done) {
		graph.getFile(__dirname, 'jkroso-path').then(function (resolved) {
			return file.local(__dirname+'/components/jkroso-path/component.json').then(function (file) {
				file.should.deep.equal(resolved)
			})
		}).nend(done)
	})
	// I've slowed index down by making it massive. Perhaps there is a better way
	// I am trying to ensure getFile isn't subject to any kind of race.
	it('should respect module priority', function (done) {
		var base = __dirname + '/fixtures/simple'
		graph.getFile(base, './index').then(function (file) {
			file.should.have.property('path', base+'/index')
			file.should.have.property('text', fs.readFileSync(base+'/index', 'utf-8'))
		}).nend(done)
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
		}).nend(done)
	})
})

describe('resolveInternal(base, name)', function () {
	it('should resolve a relative path', function () {
		var base = __dirname + '/fixtures/simple'
		var p1 = base+'/index.js'
		var p2 = base+'/has_dependency.js'
		graph.data[p1] = {}
		graph.data[p2] = {}

		graph.resolveInternal(base, './index').should.equal(p1)
		graph.resolveInternal(base, './has_dependency.js').should.equal(p2)
	})

	it('should resolve a magic path', function () {
		var base = __dirname+'/fixtures/node/expandsingle'
		var p2 = base+'/node_modules/foo.js' 
		graph.data[p2] = {}

		var path = graph.resolveInternal(base, 'foo')
		should.exist(path)
		path.should.equal(p2)
	})

	it('should resolve a remote path', function () {
		graph.data = {
			'http://google.com/a/b/c': {}
		}
		debugger;
		var path = graph.resolveInternal('http://google.com/a/b', './c')
		should.exist(path)
		path.should.equal('http://google.com/a/b/c')
	})
})

it('can define custom handlers', function(done) {
	var p = __dirname + '/fixtures/non_js/example.rndom'
	
	function Rndom (file) {
		this.text = file.text
		this.path = file.path
		this.requires = function () {
			return []
		}
	}
	Rndom.test = function (file) {
		if (file.path.match(/\.rndom$/)) return 1
	}
	graph.addType(Rndom)
		.trace(p)
		.then(function (data) {
			should.exist(data)
			data.should.have.property(p)
				.and.property('text', read(p, 'utf-8'))
		}).nend(done)
})

it('should not include files it has not match for', function (done) {
	var p = __dirname + '/fixtures/non_js/example.rndom'
	
	graph.trace(p).then(function (data) {
		should.exist(data)
		data.should.have.a.lengthOf(0)
	}).nend(done)
})

describe('Loading with protocols (e.g. http:)', function () {
	var p = 'http://code.jquery.com/jquery-1.8.0.js'
	
	it('simple one file case', function (done) {
		graph.add(p).then(function (files) {
			files.should.have.a.lengthOf(1)
			files[0].path.should.equal(p)
			files[0].text.should.include('hack')
		}).nend(done)
	})
})

it('Kitchen sink', function (done) {
	var base = __dirname+'/fixtures/kitchen'
	var paths = [
			base+'/component.json',
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
			__dirname+'/node_modules/path.js'
		]

		function HTempl (file) {
			this.path = file.path
			this.text = file.text
			this.requires = function () {
				return []
			}
		}
		HTempl.test = function (file) {
			if (file.path.match(/\.htempl$/)) return 1
		}

		graph.addType(HTempl)
			.trace(paths[0])
			// Adding the template manualy since nothing actually "require()'s" it
			.add(paths[2])
			.then(function(data) {
				data.should.have.a.lengthOf(paths.length+5)
				paths.forEach(function (p) {
					data.should.have.property(p)
						.and.property('text', read(p, 'utf-8'))
				})
			}).nend(done)
})
