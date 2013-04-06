var fs = require('fs')
  , path = require('path')
  , resolve = path.resolve
  , should = require('chai').should()
  , Graph = require('..')
  , util = require('./utils')

var graph
var root = resolve(__dirname, './fixtures/jade')+'/'

describe('jade plugin', function () {
	it('can load the plugin', function () {
		new Graph().use('jade')
	})

	beforeEach(function () {
		graph = new Graph().use('javascript', 'jade')
	})
	
	it('should require the runtime', function (done) {
		var files = [
			root+'tmpl.jade'
		]
		util.run(graph, files).node(done)
	})

	it('should load children in require statements', function (done) {
		var files = [
			root+'dep.jade',
			root+'tmpl.jade'
		]
		util.run(graph, files).node(done)		
	})
})