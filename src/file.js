
var doUntil = require('async-loop').doUntil
  , debug = require('debug')('getfile')
  , decorate = require('when/decorate')
  , defer = require('result/defer')
  , request = require('superagent')
  , fs = require('resultify/fs')
  , when = require('when/read')
  , Result = require('result')
  , util = require('./utils')
  , path = require('path')
  , resolve = path.resolve
  , dirname = path.dirname
  , join = path.join

module.exports = getFile

/**
 * retrieve a file
 * 
 * @param {String} base
 * @param {String} name
 * @return {Result} file
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
 * @return {Result} file
 */

function fromPackage(dir, name){
	if (util.isRemote(dir)) throw new Error('remote packages un-implemented')
	var ns = this.packageDirectory
	var readers = this.fsReaders
	var result = new Result
	var start = dir

	doUntil(function(loop){
		find(readers, readFile).then(write, function(){
			var again = dir == '/'
			dir = path.dirname(dir)
			loop(again)
		})
	}, error)

	function readFile(reader){
		return reader(join(dir, ns), name)
	}

	function write(file){
		if (typeof file == 'object') result.write(file)
		else getLocalFile(file).then(write, error)
	}

	function error(){
		result.error(new Error('unable to resolve '+name+' from '+start))
	}

	return result
}

/**
 * look for a successful call of `ƒ`
 * 
 * @param {Array} array
 * @param {Function} ƒ
 * @return {Result}
 */

function find(array, ƒ){
	return defer(function(write, fail){
		var len = array.length
		var i = 0
		function next(e){
			if (i == len) fail(new Error('all failed: '+e.message))
			else when(ƒ(array[i], i++), write, next)
		}
		next()
	})
}

/**
 * Retrieve a file from the internet
 * 
 * @param {String} path
 * @return {Result} file
 */

function getRemoteFile(path){
	return defer(function(write, fail){
		debug('remote requesting %s', path)
		request.get(path).buffer().end(function(res){
			debug('response %s => %d', path, res.status)
			if (!res.ok) fail(res.error)
			else write({
				'path': path,
				'text': res.text,
				'last-modified': Date.parse(res.headers['last-modified']) || Date.now()
			})
		})
	})
}

/**
 * Retrive a file from the local file system
 * 
 * @param {String} path
 * @return {Result} file
 */

function getLocalFile(path) {
	var real = fs.realpath(path)
	return new File(
		real,
		path,
		fs.stat(real),
		fs.readFile(real, 'utf8'))
}

var File = decorate(function(real, path, stat, text){
	this.path = real
	if (real != path) this.alias = path
	this['last-modified'] = +stat.mtime
	this.text = text
	return this
})