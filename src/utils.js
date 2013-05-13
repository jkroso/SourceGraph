
var path = require('path')
  , url = require('url')

function isRelative(path){
	return (/^\./).test(path)
}

function isAbsolute(path){
	return (/^\//).test(path)
}

function isRemote(path){
	return (/^[a-zA-Z]+:\/\//).test(path)
}

/**
 * attempt to join `base` and `req` if safe to do so
 * (String, String) -> String?
 */

exports.joinPath = function(base, req){
	if (isRelative(req)) {
		return isRemote(base)
			? url.resolve(base.replace(/\/?$/, '/'), req)
			: path.join(base, req)
	}
	if (isAbsolute(req)) {
		return isRemote(base) 
			? url.resolve(base, req) 
			: req
	}
	if (isRemote(req)) return req
}

exports.partition = function(array, pred){
	var a = []
	var b = []
	var t
	for (var i = 0, len = array.length; i < len; i++) {
		if (pred(t = array[i])) a.push(t) 
		else b.push(t)
	}
	return [a,b]
}

exports.isRemote = isRemote
