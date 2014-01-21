
var each = require('foreach/async')
var when = require('result').when
var File = require('./file')

module.exports = graph

/**
 * parse a project from its entry file
 *
 * @param {String} entry
 * @return {Array}
 */

function graph(entry){
  var file = new File(entry)
  var seen = {}
  var out = []
  function trace(file){
    if (seen[file.path]) return
    seen[file.path] = file
    out.push(file)
    return each(file.children, trace)
  }
  return when(trace(file), function(){ return out })
}
