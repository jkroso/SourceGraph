
var fs = require('fs')
  , path = require('path')
  , join = path.join
  , util = require('./utils')
  , Promise = require('laissez-faire/full')
  , request = require('superagent')
  , doUntil = require('async-loop').doUntil
  , when = require('when/read')
  , debug = require('debug')('getfile')

module.exports = getFile

/**
 * retrieve a file
 * 
 * @param {String} base
 * @param {String} name
 * @return {Promise} file
 */

function getFile(base, name){
	var path = util.joinPath(base, name)
	if (!path) return fromPackage.call(this, base, name)
	var get = getFile[protocol(path)]
	return find(this.completions(path), get)
}

/**
 * determine an appropriate retreval protocol for `path`
 * 
 * @param {String} path
 * @return {String}
 */

function protocol(path){
	if (/^\//.test(path)) return 'fs'
	return (/^(\w+):\/\//).exec(path)[1]
}

// protocol handlers
getFile.http = getFile.https = getRemoteFile
getFile.fs = getLocalFile

/**
 * get a file from a package
 * 
 * @param {String} dir
 * @param {String} name
 * @return {Promise} file
 */

function fromPackage(dir, name){
	if (util.isRemote(dir)) throw new Error('remote packages un-implemented')
	var start = dir
	var p = new Promise
	var ns = this.packageDirectory
	var readers = this.fsReaders

	doUntil(function(loop){
		find(readers, readFile).then(fulfill, function(){
			var again = dir == '/'
			dir = path.dirname(dir)
			loop(again)
		})
	}, reject)

	function readFile(reader){
		return reader(join(dir, ns), name)
	}

	function fulfill(file){
		p.fulfill(file)
	}

	function reject(){
		p.reject(new Error('unable to resolve '+name+' from '+start))
	}

	return p
}

/**
 * look for a successful call of `ƒ`
 * 
 * @param {Array} array
 * @param {Function} ƒ
 * @return {Promise}
 */

function find(array, ƒ){
	var len = array.length
	var i = 0
	var p = new Promise
	
	function fulfill(value){
		p.fulfill(value)
	}
	
	function next(e){
		if (i == len) p.reject(new Error('all failed: '+e.message))
		else when(ƒ(array[i], i++), fulfill, next)
	}
	next()

	return p
}

/**
 * Retrieve a file from the internet
 * 
 * @param {String} path
 * @return {Promise} file
 */

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

/**
 * Retrive a file from the local file system
 * 
 * @param {String} path
 * @return {Promise} file
 */

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
