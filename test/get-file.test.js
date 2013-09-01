
var getFile = require('../src/file')
var read = require('./utils').read
var chai = require('./chai')
var path = require('path')
var Graph = require('..')
var fs = require('fs')

describe('getFile(base, path)', function(){
	var jquery = 'http://code.jquery.com/jquery-1.8.0.js'
	var localjq = __dirname + '/fixtures/jquery-1.8.0.js'
	var jqHost = jquery.replace(/\/[^\/]*$/, '')
	var graph
	beforeEach(function(){
		graph = new Graph
	})

	it('should fetch a local file', function(done){
		var base = __dirname + '/fixtures/simple'
		graph.getFile(base, './index.js').then(function(file){
			file.should.have.property('path', base+'/index.js')
			file.should.have.property('text', read(base+'/index.js'))
		}).node(done)
	})

	it('should fetch an absolute url from a remote base', function(done){
		graph.getFile(jqHost, jquery).then(function(file){
			file.should.have.property('path', jquery);
			file.should.have.property('text', read(localjq))
		}).node(done)
	})
	
	it('should fetch a relative path from a url base', function(done){
		graph.getFile(jqHost, './jquery-1.8.0.js').then(function(file){
			file.should.have.property('path', jquery)
			file.should.have.property('text', read(localjq))
		}).node(done)
	})

	it('should fetch a remote url from a local base', function(done){
		graph.getFile('/', jquery).then(function(file){
			file.should.have.property('path', jquery)
			file.should.have.property('text', read(localjq))
		}).node(done)
	})

	it('should not fetch an absolute local path from a url base', function(done){
		var path = __dirname+'/get-file.test.js'
		graph.getFile(jqHost, path).then(function(file){
			file.should.have.property('path', path)
			file.should.have.property('text', read(path))
		}).then(null, function(){ done() })
	})
	
	it('should resolve a node package from a local base', function(done){
		graph.use('nodeish')
		var dir = __dirname+'/fixtures/node/expandsingle'
		graph.getFile(dir, 'foo.js').then(function(file){
			var path = dir+'/node_modules/foo.js'
			file.should.have.property('path', path)
			file.should.have.property('text', read(path))
		}).node(done)
	})

	// I've slowed index down by making it massive. Perhaps there is a better way
	// I am trying to ensure getFile isn't subject to any kind of race.
	it('should respect file completion priority', function(done){
		var base = __dirname + '/fixtures/simple'
		graph.getFile(base, './index').then(function(file){
			file.should.have.property('path', base+'/index')
			file.should.have.property('text', read(base+'/index'))
		}).node(done)
	})
})