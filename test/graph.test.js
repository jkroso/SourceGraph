
var graph = require('..')
var fs = require('fs')

it('should return a list of modules', function*(){
  var files = yield graph(require.resolve('..'))
  files[0].id.should.eql(require.resolve('..'))
  files[0].source.should.eql(fs.readFileSync(files[0].id, 'utf8'))
})

it('specializing for node environments', function*(){
  var files = yield graph(fixture('x-platform.js'), {env: 'node'})
  files.should.have.a.lengthOf(2)
  files[0].id.should.eql(fixture('x-platform.js'))
  files[1].id.should.eql(fixture('node_modules/x-platform/node.js'))
})

it('specializing for browser environments', function*(){
  var files = yield graph(fixture('x-platform.js'))
  files.should.have.a.lengthOf(2)
  files[0].id.should.eql(fixture('x-platform.js'))
  files[1].id.should.eql(fixture('node_modules/x-platform/browser.js'))
})
