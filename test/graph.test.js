var fs = require('fs'),
    read = fs.readFileSync,
    path = require('path'),
    resolve = path.resolve,
    assert = require('chai').assert,
    should = require('chai').should(),
    Graph = require('../src');

describe('Graph(entry)', function (graph) {
    beforeEach(function () {
        graph = new Graph
        graph.types = require('./types').slice()
        graph.hashResolvers = require('./resolvers/hash').slice()
        graph.osResolvers = require('./resolvers/filesystem').slice()
    })
    it('can load a single file', function (done) {
        var p = path.resolve(__dirname, './fixtures/simple/index.js')
        graph
            .add(p)
            .then(function (files) {
                Object.keys(files).should.have.a.lengthOf(1)
                Object.keys(files)[0].should.equal(p)
                files[p].text.should.equal(read(p, 'utf-8').toString())
                done()
            })
    })
    it('can load several files', function (done) {
        var p1 = path.resolve(__dirname, './fixtures/simple/index.js');
        var p2 = path.resolve(__dirname, './fixtures/simple/has_dependency.js');
        graph
            .add(p1)
            .add(p2)
            .then(function (files) {
                Object.keys(files).should.have.a.lengthOf(2)
                files[p1].text.should.equal(read(p1, 'utf-8'))
                files[p2].text.should.equal(read(p2, 'utf-8'))
                done()
            })
    })
    it('can load with one relative dependency', function (done) {
        var p = path.resolve(__dirname, './fixtures/simple/has_dependency.js')
        graph
            .trace(p)
            .then(function (files) {
                Object.keys(files).should.have.a.lengthOf(2)
                files[p].text.should.equal(read(p, 'utf-8').toString())
                done()
            })
    })
    it('can define custom handlers', function(done) {
        var p = path.resolve(__dirname, './fixtures/non_js/example.rndom');
        graph
            .addType({
                re: /\.rndom$/,
                constructor: function (file) {
                    require('./types/javascript.js').call(this, file)
                    this.requires = function () {
                        return []
                    }
                }
            })
            .trace(p)
            .then(function (data) {
                should.exist(data[p])
                data[p].text.should.equal(read(p, 'utf-8'))
                done()
            })
            .throw()
    })
    describe('Loading with protocols (e.g. http:)', function () {
        it('simple one file case', function (done) {
            var p = 'https://raw.github.com/jkroso/LP/master/src/LP.js'
            graph
                .trace(p)
                .then(function (files) {
                    Object.keys(files).should.have.a.lengthOf(1)
                    Object.keys(files)[0].should.equal(p)
                    files[p].text[0].should.equal('d')
                    done()
                })
        })
    })
    describe('npm magic', function () {
        it('can include a simple npm package', function(done) {
            var p = resolve(__dirname, './fixtures/node/expandsingle/index.js')
            var n = resolve(__dirname, './fixtures/node/expandsingle/node_modules/foo.js')
            graph
                .trace(p)
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(2)
                    data[p].text.should.equal(read(p, 'utf-8'))
                    data[n].text.should.equal(read(n, 'utf-8'))
                    done()
                })
        })
        it('even if it isn\'t relative but has a .js on the end', function (done) {
            var p = resolve(__dirname, './fixtures/node/with_extension/index.js')
            var n = resolve(__dirname, './fixtures/node/with_extension/node_modules/foo.js')
            graph
                .trace(p)
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(2)
                    data[p].text.should.equal(read(p, 'utf-8'))
                    data[n].text.should.equal(read(n, 'utf-8'))
                    done()
                })
        })
        it('can include a npm package folder from an index.js', function (done) {
            var p = resolve(__dirname, 'fixtures/node/expandindex/index.js')
            var n = resolve(__dirname, './fixtures/node/expandindex/node_modules/foo/index.js')
            graph
                .trace(p)
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(2)
                    data[p].text.should.equal(read(p, 'utf-8'))
                    data[n].text.should.equal(read(n, 'utf-8'))
                    done()
                })
        })
        it('can add a dependency on a package that is a directory (package.json)', function(done) {
            var p = resolve(__dirname, 'fixtures/node/expandpackage/index.js')
            var n1 = resolve(__dirname, './fixtures/node/expandpackage/node_modules/foo/package.json')
            var n2 = resolve(__dirname, './fixtures/node/expandpackage/node_modules/foo/lib/sub.js')
            graph
                .trace(p)
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(3)
                    data[p].text.should.equal(read(p, 'utf-8'))
                    data[n1].text.should.equal(read(n1, 'utf-8'))
                    data[n2].text.should.equal(read(n2, 'utf-8'))
                    done()
                })
        })
        it('when a dependency has a (sub)dependency, it gets resolved as well', function(done) {
            var p = resolve(__dirname, 'fixtures/node/hassubdependency/index.js')
            var n1 = resolve(__dirname, './fixtures/node/hassubdependency/node_modules/foo/index.js')
            var n2 = resolve(__dirname, './fixtures/node/hassubdependency/node_modules/foo/node_modules/bar/index.js')
            graph
                .trace(p)
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(3)
                    data[p].text.should.equal(read(p, 'utf-8'))
                    data[n1].text.should.equal(read(n1, 'utf-8'))
                    data[n2].text.should.equal(read(n2, 'utf-8'))
                    done()
                })
        })
        it('when deps are mixed', function(done) {
            var p = resolve(__dirname, 'fixtures/node/mixed_deps/package.json')
            var n1 = resolve(__dirname, './fixtures/node/mixed_deps/main.js')
            var n2 = resolve(__dirname, './fixtures/node/mixed_deps/node_modules/aaa/index.js')
            var n3 = resolve(__dirname, './fixtures/node/mixed_deps/node_modules/bbb.js')
            var n4 = resolve(__dirname, './fixtures/node/mixed_deps/node_modules/aaa/node_modules/ccc/index.js')
            graph
                .trace(p)
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(5)
                    data[p].text.should.equal(read(p, 'utf-8'))
                    data[n1].text.should.equal(read(n1, 'utf-8'))
                    data[n2].text.should.equal(read(n2, 'utf-8'))
                    data[n3].text.should.equal(read(n3, 'utf-8'))
                    data[n4].text.should.equal(read(n4, 'utf-8'))
                    done()
                })
        })
        it('should resolve core modules with the highest priority', function (done) {
            var p = resolve(__dirname,  './fixtures/node/core/index.js')
            var n1 = resolve(__dirname, '../src/node_modules/path.js')
            var n2 = resolve(__dirname, '../src/node_modules/events.js')
            graph
                .trace(p)
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(3)
                    data[p].text.should.equal(read(p, 'utf-8'))
                    data[n1].text.should.equal(read(n1, 'utf-8'))
                    data[n2].text.should.equal(read(n2, 'utf-8'))
                    done()
                })
        })
        it('should not include unused dependencies mention in package.json')
    })
    describe('component/component magic', function () {
        // According to the component spec a component must always include a main file
        it.skip('should always include the component.json even if nothing else', function (done) {
            var c1 = resolve(__dirname, './fixtures/cc/empty/component.json')
            graph
                .trace(c1)
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(1)
                    data[c1].text.should.equal(read(c1, 'utf-8'))
                    done()
                })
        })
        it('should handle a simple case where component.json requires one script file', function (done) {
            var paths = [
                resolve(__dirname, './fixtures/cc/simple/component.json'),
                resolve(__dirname, './fixtures/cc/simple/index.js')
            ]
            graph
                .trace(paths[0])
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(paths.length)
                    paths.forEach(function (path) {
                        data[path].text.should.equal(read(path, 'utf-8'))
                    })
                    done()
                })
        })
        it('can include another component', function (done) {
            var paths = [
                resolve(__dirname, './fixtures/cc/with_dep/component.json'),
                resolve(__dirname, './fixtures/cc/components/component-inherit/component.json'),
                resolve(__dirname, './fixtures/cc/components/component-inherit/index.js'),
            ];
            graph
                .trace(paths[0])
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(paths.length+2)
                    paths.forEach(function (path) {
                        data[path].text.should.equal(read(path, 'utf-8'))
                    })
                    data[resolve(__dirname, './fixtures/cc/with_dep/components/inherit')]
                        .text.should.equal('module.exports = require("component-inherit")')
                    done()
                })
        })
        it('can include multiple components', function (done) {
            var paths = [
                resolve(__dirname, './fixtures/cc/with_deps/component.json'),
                resolve(__dirname, './fixtures/cc/components/animal/component.json'),
                resolve(__dirname, './fixtures/cc/components/animal/index.js'),
                resolve(__dirname, './fixtures/cc/components/component-inherit/component.json'),
                resolve(__dirname, './fixtures/cc/components/component-inherit/index.js'),
            ];
            graph
                .trace(paths[0])
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(paths.length+3)
                    paths.forEach(function (path) {
                        data[path].text.should.equal(read(path, 'utf-8'))
                    })
                    done()
                })
        })
    })
    it('Kitchen sink', function (done) {
        var paths = [
                resolve(__dirname, './fixtures/kitchen/index.js'),
                resolve(__dirname, './fixtures/kitchen/tip.htempl'),
                resolve(__dirname, './fixtures/kitchen/Subscription.js'),
                resolve(__dirname, './fixtures/kitchen/components/component-tip/component.json'),
                resolve(__dirname, './fixtures/kitchen/components/component-tip/index.js'),
                resolve(__dirname, './fixtures/kitchen/components/component-tip/template.js'),
                resolve(__dirname, './fixtures/kitchen/components/component-tip/tip.css'),
                resolve(__dirname, './fixtures/kitchen/components/component-jquery/component.json'),
                resolve(__dirname, './fixtures/kitchen/components/component-jquery/index.js'),
                resolve(__dirname, './fixtures/kitchen/components/component-emitter/component.json'),
                resolve(__dirname, './fixtures/kitchen/components/component-emitter/index.js'),
            ];
            graph
                .addType({
                    re: /\.htempl$/,
                    constructor: function (file) {
                        require('./types/javascript.js').call(this, file)
                        this.requires = function () {
                            return []
                        }
                    }
                })
                .trace(paths[0])
                .add(paths[1])
                .then(function(data) {
                    Object.keys(data).should.have.a.lengthOf(paths.length+5)
                    paths.forEach(function (p) {
                        data[p].text.should.equal(read(p, 'utf-8'))
                    })
                    var n1 = resolve(__dirname, '../src/node_modules/path.js')
                    data[n1].text.should.equal(read(n1, 'utf-8'))
                    done()
                })
    })
})