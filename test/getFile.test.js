var should = require('chai').should()
  , getFile = require('../src/file')
  , path = require('path')
  , all = require('when-all')
  , readLocal = getFile.readLocal
  , local = getFile.local
  , remote = getFile.remote
  , magic = getFile.magic
  , resolvers = require('./resolvers/filesystem')

var subject = path.join(__dirname, './types/javascript.js')

describe('readLocal(path)', function () {
	it('should return a promise for a file', function (done) {
		readLocal(subject).then(function (file) {
			file.should.have.property('path').and.equal(subject)
			file.should.have.property('text').and.include('Module')
			file.should.have.property('last-modified').and.be.a('number')
		}).nend(done)
	})
})

describe('local(path)', function () {
	it('should handle various forms of path slang', function (done) {
		all([
			__dirname+'/types/index.js',
			__dirname+'/types/index',
			__dirname+'/types/',
			__dirname+'/types',
			__dirname+'/types/javascript',
			__dirname+'/types/javascript.js'
		].map(local)).nend(done)
	})
})

var jquery = 'http://code.jquery.com/jquery-1.8.0.js'
var localjq = __dirname+'/fixtures/jquery-1.8.0.js'
var jqHost = jquery.replace(/\/[^\/]*$/, '')

describe('remote(path)', function () {
	it('Should fetch using an absolute url', function (done) {
		remote(jquery).then(function (file) {
			file.should.have.property('path').and.equal(jquery)
			file.should.have.property('text').and.include('hack')
			file.should.have.property('last-modified').and.be.a('number')
		}).nend(done)
	})

	it('Local and remote files behave identically', function (done) {
		all([
			local(localjq),
			remote(jquery)
		]).then(function (files) {
			files[0].path.should.equal(localjq)
			files[1].path.should.equal(jquery)
			files[0].text.should.equal(files[1].text)
		}).nend(done)
	})
})

describe('magic(base, name, resolvers)', function () {
	it('should resolve a node_module file', function (done) {
		all([
			magic(__dirname, 'file.js', resolvers),
			magic(__dirname, 'file', resolvers)
		]).then(function (files) {
			files.forEach(function (file) {
				file.text.should.include('hello')
			})
		})
		.nend(done)
	})

	it('should resolve a node_modules package with an index.js', function (done) {
		magic(__dirname, 'package', resolvers).then(function (file) {
			file.path.should.equal(__dirname+'/node_modules/package/index.js')
		}).nend(done)
	})

	it('should resolve to the package.json if no index exists', function (done) {
		magic(__dirname, 'noindex', resolvers).then(function(file){
			file.path.should.equal(__dirname+'/node_modules/noindex/package.json')
		}).nend(done)
	})

	it('should resolve built in node modules', function (done) {
		all([
			magic(__dirname, 'path', resolvers),
			magic(__dirname, 'events', resolvers),
			magic(__dirname, 'assert', resolvers),
			magic(__dirname, 'http', resolvers),
			magic(__dirname, 'querystring', resolvers),
		]).nend(done)
	})

	it('should allow custom modules to take priority over node core', function (done) {
		magic(__dirname, 'path', resolvers).then(function (file) {
			return readLocal(__dirname+'/node_modules/path.js').then(function (path) {
				file.should.deep.equal(path)
			})
		}).nend(done)
	})

	it('should resolve a component', function (done) {
		magic(__dirname, 'jkroso-path', resolvers).nend(done)
	})

	it('should resolve to the component.json event when index.js exists', function (done) {
		magic(__dirname, 'jkroso-path', resolvers).then(function (file) {
			return readLocal(__dirname+'/components/jkroso-path/component.json').then(function (path) {
				file.should.deep.equal(path)
			})
		}).nend(done)
	})
})

describe('getFile(base, path)', function (get) {
	beforeEach(function () {
		get = getFile(resolvers)
	})
	var cachJQ = remote(jquery)

	it('should fetch an absolute url from a remote base', function (done) {
		get(jqHost, jquery).then(function (file) {
			file.path.should.equal(jquery)
		}).nend(done)
	})
	
	it('should fetch a relative path from a url base', function (done) {
		all([
			get(jqHost, './jquery-1.8.0.js'),
			cachJQ
		]).then(function (files) {
			files[0].should.deep.equal(files[1])
		}).nend(done)
	})

	it('should fetch a remote url from a local base', function (done) {
		get('/', jquery).then(function (resolved) {
			return cachJQ.then(function (file) {
				file.should.deep.equal(resolved)
			})
		}).nend(done)
	})

	it('should fetch an absolute local path from a url base', function (done) {
		get(jqHost, __dirname+'/types').then(function (resolved) {
			return readLocal(__dirname+'/types/index.js').then(function (file) {
				file.should.deep.equal(resolved)
			})
		}).nend(done)
	})
	
	it('should resolve a node package from a local base', function (done) {
		get(__dirname, 'file.js').then(function (resolved) {
			return readLocal(__dirname+'/node_modules/file.js').then(function (file) {
				file.should.deep.equal(resolved)
			})
		}).nend(done)
	})

	it('should resolve a component from a local path', function (done) {
		get(__dirname, 'jkroso-path').then(function (resolved) {
			return readLocal(__dirname+'/components/jkroso-path/component.json').then(function (file) {
				file.should.deep.equal(resolved)
			})
		}).nend(done)
	})
})