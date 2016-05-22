/* globals read fixture */

var core = require('browser-builtins')
var File = require('../file')
var fs = require('fs')

it('.source', function*(){
  var file = fixture('simple.js')
  var js = yield new File(file).source
  js.should.eql(read(file))
})

describe('.meta', function(){
  it('should find package.json in same directory', function*(){
    var file = yield new File(fixture('simple.js')).meta
    file.id.should.eql(fixture('package.json'))
  })

  it('up multiple directories', function*(){
    var file = yield new File(fixture('node_modules/one/index.js')).meta
    file.id.should.eql(fixture('package.json'))
  })

  it('should produce a nice error if it can\'t find a meta file', function*(){
    fs.writeFileSync('/tmp/index.js', '// nothing')
    try {
      yield new File('/tmp/index.js').meta
      throw new Error('should not be reach')
    } catch (e) {
      e.message.should.match(/couldn't find meta file/i)
    }
  })
})

describe('.transforms', function(){
  it('should resolve to a list of modules', function*(){
    var arr = yield new File(fixture('compose.trans')).transforms
    arr.should.eql([
      require(fixture('node_modules/to-object-transform.js')),
      require(fixture('node_modules/simple-transform.js'))
    ])
  })

  it('global transforms', function*(){
    var file = new File(fixture('package.json'))
    var json = function(src){ return 'module.exports =' + src }
    file.opts = {'transpile': [['*.json', json]]};
    (yield file.transforms).should.eql([json])
  })

  it('should be empty if it can\'t find a meta file', function*(){
    fs.writeFileSync('/tmp/index.js', '// nothing')
    var arr = yield new File('/tmp/index.js').transforms
    arr.should.be.empty
  })
})

describe('.javascript', function(){
  it('should be enumerable', function(){
    var file = new File
    file.javascript = ''
    file.should.include.key('javascript')
  })

  it('no transforms', function*(){
    var file = fixture('simple.js')
    var js = yield new File(file).javascript
    js.should.eql(read(file))
  })

  it('single transform', function*(){
    var file = fixture('simple.trans')
    var js = yield new File(file).javascript
    js.should.eql(read(file) + file)
  })

  it('multiple transforms', function*(){
    var file = fixture('compose.trans')
    var js = yield new File(file).javascript
    js.should.eql(JSON.stringify({src: read(file), id: file}) + file)
  })

  it('browserify transforms', function*(){
    var file = fixture('browserify/transform/index.html')
    var js = yield new File(file).javascript
    js.should.eql('module.exports = ' + JSON.stringify(read(file)) + ';\n')
  })
})

describe('builtin transforms', function(){
  it('babel', function*() {
    const file = new File()
    file.source = '<a/>'
    file.transforms = [require('../transforms/babel->js')]
    const js = yield file.javascript
    js.should.eql('JSX("a");')
  })
})

describe('.requires', function(){
  it('empty', function(){
    var file = new File(fixture('simple.js'))
    file.javascript = ''
    file.requires.should.eql([])
  })

  it('static requires', function(){
    var file = new File(fixture('simple.js'))
    file.javascript = 'require("./");require("a")'
    file.requires.should.eql(['./', 'a'])
  })
})

describe('.dependencies', function(){
  it('should resolve relative dependencies', function*(){
    var file = new File(fixture('main.js'));
    (yield file.dependencies).should.eql([fixture('simple.js')])
  })

  it('should resolve naked modules', function*(){
    var file = new File(fixture('r-naked-mod.js'));
    (yield file.dependencies).should.eql([fixture('node_modules/two.js')])
  })

  it('should resolve an implicit "index.js" module', function*(){
    var file = new File(fixture('r-index-mod.js'))
    var arr = yield file.dependencies
    arr.should.eql([fixture('node_modules/one/index.js')])
  })

  it('should resolve the main file in a package', function*(){
    var file = new File(fixture('r-main-mod.js'))
    var arr = yield file.dependencies
    arr.should.eql([fixture('node_modules/three/main.js')])
  })

  it('should resolve node core modules', function*(){
    var file = new File(fixture('node-core.js'));
    (yield file.dependencies).should.eql([
      core['fs'],
      core['http'],
      core['dns'],
      core['path']
    ])
  })

  it('browserify renames', function*(){
    var file = new File(fixture('browserify/renames/index.js'))
    var deps = yield file.dependencies
    deps.should.eql([fixture('browserify/node_modules/component-event/index.js')])
  })
})

describe('.children', function(){
  it('should be an array of Files', function*(){
    var file = new File(fixture('main.js'))
    var arr = yield file.children
    arr.should.have.a.lengthOf(1)
    arr[0].should.have.property('id', fixture('simple.js'))
  })

  it('should follow symlinks', function*(){
    var file = new File(fixture('symlinked-dep.js'))
    var arr = yield file.children
    arr.should.have.a.lengthOf(1)
    arr[0].should.have.property('id', fixture('simple.js'))
    arr[0].should.have.property('aliases').eql([fixture('simple.sym')])
  })

  it('should work on package.json file', function*(){
    var file = new File.Meta(fixture('node_modules/three/package.json'))
    var arr = yield file.children
    arr.should.have.a.lengthOf(1)
    arr[0].id.should.eql(fixture('node_modules/three/main.js'))
  })

  it('should be able to require json files', function*(){
    var arr = yield new File(fixture('json.js')).children
    arr.should.have.a.lengthOf(1)
    arr[0].should.have.property('id', fixture('package.json'))
  })
})

it('.toJSON()', function*(){
  var file = new File(fixture('symlinked-dep.js'))
  var arr = yield file.children
  file.toJSON().should.eql({
    id: fixture('symlinked-dep.js'),
    source: "require('./simple.sym')",
    deps: {'./simple.sym': fixture('simple.js')},
    aliases: undefined
  });
  (yield arr[0].toJSON()).should.eql({
    id: fixture('simple.js'),
    source: read(fixture('simple.js')),
    aliases: [fixture('simple.sym')],
    deps: {}
  })
})
