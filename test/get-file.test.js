
var read = require('./utils').read
var chai = require('./chai')
var path = require('path')
var Graph = require('..')
var fs = require('fs')
var graph

describe('getFile(base, path)', function(){
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
