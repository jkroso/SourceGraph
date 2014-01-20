
var util = require('./utils')
var chai = require('./chai')
var path = require('path')
var resolve = path.resolve
var Graph = require('..')
var fs = require('fs')

var graph
var root = resolve(__dirname, './fixtures/jade')+'/'

describe('jade plugin', function(){
  it('can load the plugin', function(){
    new Graph().use('jade')
  })

  beforeEach(function(){
    graph = new Graph().use('javascript', 'jade')
  })
  
  it('should require the runtime', function(done){
    var files = [
      root+'tmpl.jade'
    ]
    util.run(graph, files).node(done)
  })

  it('should load children in require statements', function(done){
    var files = [
      root+'dep.jade',
      root+'tmpl.jade'
    ]
    util.run(graph, files).node(done)   
  })
})