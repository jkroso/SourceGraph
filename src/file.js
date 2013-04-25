
var fs = require('fs')
  , path = require('path')
  , util = require('./utils')
  , Promise = require('laissez-faire/full')
  , request = require('superagent')
  , doUntil = require('async-loop').doUntil
  , first = require('when-first/series')
  , debug = require('debug')('getfile')

module.exports = getFile

// add protocol handlers
getFile.http = getFile.https = getRemoteFile
getFile.fs = getLocalFile

// Retrive a file object
// (String, String) -> Promise file
function getFile(base, name){
	var path = util.joinPath(base, name)
	if (!path) return fromPackage.call(this, base, name)
	var get = getFile[protocol(path)]
	return first(this.completions(path).map(get))
}

// determine an appropriate retreval protocol for `path`
// (String) -> String
function protocol(path){
	if (/^\//.test(path)) return 'fs'
	return (/^(\w+):\/\//).exec(path)[1]
}

// get a file from a package
// (String, String) -> Promise file
function fromPackage(dir, name){
	if (util.isRemote(dir)) throw new Error('remote packages un-implemented')
	var start = dir
	var p = new Promise
	var readers = this.fsReaders
	doUntil(function(loop){
		first(readers.map(function(read){
			return read(dir, name)
		})).then(loop, function(){
			var cwd = dir
			dir = path.dirname(dir)
			loop(cwd == '/')
		})
	}, done)
	function done(file){
		if (typeof file == 'object') p.fulfill(file)
		else p.reject(new Error('unable to resolve '+name+' from '+start))
	}
	return p
}

// Retrieve a file from the internet
// (String) -> Promise file
function getRemoteFile(path){
	var p = new Promise
	debug('Remote requesting %s', path)
	request.get(path).buffer().end(function (res) {
		debug('Response %s => %d', path, res.status)
		if (!res.ok) return p.reject(res.error)
		p.resolve({
			'path': path,
			'text': res.text,
			'last-modified': Date.parse(res.headers['last-modified']) || Date.now()
		})
	})
	return p
}

// Retrive a file from the local file system
// (String) -> Promise file
function getLocalFile(path) {
	var p = new Promise
	fs.stat(path, function (e, stat) {
		if (e) return p.reject(e)
		fs.readFile(path, 'utf-8', function (e, txt) {
			if (e) return p.reject(e)
			p.resolve({
				'path': path,
				'text': txt,
				'last-modified': +stat.mtime
			})
		})
	})
	return p
}
