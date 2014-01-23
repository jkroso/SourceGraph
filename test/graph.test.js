
var graph = require('..')
var fs = require('fs')

it('should return a list of modules', function(done){
  graph(require.resolve('..')).then(function(files){
    files[0].id.should.eql(require.resolve('..'))
    files[0].source.should.eql(fs.readFileSync(files[0].id, 'utf8'))
  }).node(done)
})
