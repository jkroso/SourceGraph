var mocha = require('mocha'),
    assert = require('assert'),
    getFile = require('../src/file.js'),
    path = require('path'),
    when = require('when')

var subject = path.join(__dirname, '../subject/index.js')

describe('getFile(path)', function () {
    
    it('Should fetch local files', function () {
        var res = getFile(subject)
        assert(res, 'Something was returned')
    })

    it('Should return a promise', function () {
        var res = getFile(subject)
        assert(res.then, 'Has then property')
        assert(typeof res.then === 'function', 'Is a function')
    })

    it('The promise should resolve with a File object', function (done) {
        getFile(subject).then(function (val) {
            assert(val, 'Returns a value')
            assert(val['last-modified'], 'Has a last modified property')
            assert(val['text'], 'Has a text property')
            assert(val['path'], 'Has a path property')
            done()
        })
    })

    it('Remote files should resolve with the same type', function (done) {
        getFile('http://code.jquery.com/jquery.min.js').then(function (val) {
            assert(val, 'Returns a value')
            assert(val['last-modified'], 'Has a last modified property')
            assert(val['text'], 'Has a text property')
            assert(val['path'], 'Has a path property')
            done()
        })  
    })

    it('Local and remote files behave identically', function (done) {
        when.all([
            getFile(path.join(__dirname, '../subject/jquery-1.8.0.min.js')),
            getFile('http://code.jquery.com/jquery-1.8.0.min.js')
        ]).then(function (all) {
            assert.equal(all[0].text, all[1].text, 'match')
            done()
        })
    })

    describe('Defualt paths', function () {
        it('Should default to .js if not extension is present', function (done) {
            getFile(path.join(__dirname, '../subject/index')).then(function (file) {
                assert(file)
                done()
            })
        })

        it('Should fetch index.js if the path is a directory', function (done) {
            getFile(path.join(__dirname, '../subject/'))
                .then(function (file) {
                    assert(file)
                    done()
                })  
        })

        it('With local address', function (done) {
            when.all([
                getFile(path.join(__dirname, '../subject/index.js')),
                getFile(path.join(__dirname, '../subject/index')),
                getFile(path.join(__dirname, '../subject/'))
            ]).then(function (all) {
                assert(all[0].text === all[1].text && all[1].text === all[2].text)
                done()
            }, function (e) {
                debugger;
            })
        })
        
        it('With remote address', function (done) {
            when.all([
                getFile('http://raw.github.com/jkroso/ContextMenu/master/src/index.js'),
                getFile('http://raw.github.com/jkroso/ContextMenu/master/src/index'),
                getFile('http://raw.github.com/jkroso/ContextMenu/master/src/')
            ]).then(function (all) {
                assert(all[0].text === all[1].text && all[1].text === all[2].text)
                done()
            }, function (e) {
                debugger;
            })
        })
    })
})
