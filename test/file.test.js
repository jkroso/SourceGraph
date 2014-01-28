
var core = require('browser-builtins')
var File = require('../file')

it('.source', function(done){
  var file = fixture('simple.js')
  new File(file).source.should.become(read(file)).notify(done)
})

describe('.meta', function(){
  it('should find package.json in same directory', function(done){
    new File(fixture('simple.js')).meta.then(function(file){
      file.id.should.eql(fixture('package.json'))
    }).node(done)
  })

  it('up multiple directories', function(done){
    new File(fixture('node_modules/one/index.js'))
      .meta.then(function(file){
        file.id.should.eql(fixture('package.json'))
      }).node(done)
  })
})

describe('.transforms', function(){
  it('should resolve to a list of modules', function(done){
    new File(fixture('compose.trans'))
      .transforms.should.become([
        fixture('node_modules/to-object-transform.js'),
        fixture('node_modules/simple-transform.js')
      ]).notify(done)
  })

  it('global transforms', function(done){
    var file = new File(fixture('package.json'))
    var json = function(src){ return 'module.exports =' + src }
    file.opts = {'transpile': ['*.json', json]}
    file.transforms.then(function(arr){
      arr.should.eql([json])
    }).node(done)
  })
})

describe('.javascript', function(){
  it('should be enumerable', function(){
    var file = new File
    file.javascript = ''
    file.should.include.key('javascript')
  })

  it('no transforms', function(done){
    var file = fixture('simple.js')
    new File(file).javascript.should.become(read(file)).notify(done)
  })

  it('single transform', function(done){
    var file = fixture('simple.trans')
    new File(file).javascript.should.become(read(file) + file).notify(done)
  })

  it('multiple transforms', function(done){
    var file = fixture('compose.trans')
    new File(file).javascript
      .should.become(JSON.stringify({src: read(file), id: file}) + file)
      .notify(done)
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
  it('should resolve relative dependencies', function(done){
    new File(fixture('main.js')).dependencies
      .should.become([fixture('simple.js')])
      .notify(done)
  })

  it('should resolve naked modules', function(done){
    new File(fixture('r-naked-mod.js')).dependencies
      .should.become([fixture('node_modules/two.js')])
      .notify(done)
  })

  it('should resolve an implicit "index.js" module', function(done){
    new File(fixture('r-index-mod.js')).dependencies
      .should.become([fixture('node_modules/one/index.js')])
      .notify(done)
  })

  it('should resolve the main file in a package', function(done){
    new File(fixture('r-main-mod.js')).dependencies
      .should.become([fixture('node_modules/three/main.js')])
      .notify(done)
  })

  it('should resolve node core modules', function(done){
    new File(fixture('node-core.js')).dependencies
      .should.become([
        core['fs'],
        core['http'],
        core['dns'],
        core['path']
      ])
      .notify(done)
  })
})

describe('.children', function(){
  it('should be an array of Files', function(done){
    new File(fixture('main.js')).children.then(function(arr){
      arr.should.have.a.lengthOf(1)
      arr[0].should.have.property('id', fixture('simple.js'))
    }).node(done)
  })

  it('should follow symlinks', function(done){
    new File(fixture('symlinked-dep.js')).children.then(function(arr){
      arr.should.have.a.lengthOf(1)
      arr[0].should.have.property('id', fixture('simple.js'))
      arr[0].should.have.property('aliases').eql([fixture('simple.sym')])
    }).node(done)
  })

  it('should work on package.json file', function(done){
    var file = new File.Meta(fixture('node_modules/three/package.json'))
      .children.then(function(arr){
        arr.should.have.a.lengthOf(1)
        arr[0].id.should.eql(fixture('node_modules/three/main.js'))
      }).node(done)
  })

  it('should be able to require json files', function(done){
    new File(fixture('json.js')).children.then(function(arr){
      arr.should.have.a.lengthOf(1)
      arr[0].should.have.property('id', fixture('package.json'))
    }).node(done)
  })
})

it('.toJSON()', function(done){
  var file = new File(fixture('symlinked-dep.js'))
  file.children.then(function(arr){
    file.toJSON().should.eql({
      id: fixture('symlinked-dep.js'),
      source: "require('./simple.sym')",
      deps: {'./simple.sym': fixture('simple.js')},
      aliases: undefined
    })
    return arr[0].children.then(function(){
      arr[0].toJSON().should.eql({
        id: fixture('simple.js'),
        source: read(fixture('simple.js')),
        aliases: [fixture('simple.sym')],
        deps: {},
      })
    })
  }).node(done)
})
