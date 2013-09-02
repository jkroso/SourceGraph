
var read = require('./utils').read
var run = require('./utils').run
var chai = require('./chai')
var path = require('path')
var resolve = path.resolve
var Graph = require('..')
var fs = require('fs')

var graph
var root = resolve(__dirname, './fixtures/node/test-suite')+'/'
var top = resolve(__dirname, '..')

describe('mocha plugin', function(){
	it('can load the plugin', function(){
		var g = new Graph
		g.use('mocha')
		g.fsReaders.should.have.a.lengthOf(0)
		g.hashReaders.should.have.a.lengthOf(0)
		g.types.should.have.a.lengthOf(1)
	})

	beforeEach(function(){
		graph = new Graph().use('mocha', 'nodeish')
	})

	it('should use the pre-built version of mocha but pretend its the normal one', function(done){
		var files = [
			root+'test/browser.js',
			root+'test/index.test.js',
			root+'src/index.js'
		]
		run(graph, files, 2).then(function(files){
			var built = top+'/node_modules/mocha/mocha.js'
			files.should.have.property('/node_modules/mocha/index.js')
				.and.property('text', read(built)+'\nmodule.exports = mocha')
		}).node(done)
	})
})