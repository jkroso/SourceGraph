
var graph = require('..')
var fs = require('fs')

it('should return a list of modules', function(done){
  graph(require.resolve('..')).then(function(files){
    files[0].id.should.eql(require.resolve('..'))
    files[0].source.should.eql(fs.readFileSync(files[0].id, 'utf8'))
  }).node(done)
})

it('specializing for node environments', function(done){
  graph(fixture('x-platform.js'), {env: 'node'}).then(function(files){
    files.should.have.a.lengthOf(2)
    files[0].id.should.eql(fixture('x-platform.js'))
    files[1].id.should.eql(fixture('node_modules/x-platform/node.js'))
  }).node(done)
})

it('specializing for browser environments', function(done){
  graph(fixture('x-platform.js')).then(function(files){
    files.should.have.a.lengthOf(2)
    files[0].id.should.eql(fixture('x-platform.js'))
    files[1].id.should.eql(fixture('node_modules/x-platform/browser.js'))
  }).node(done)
})
