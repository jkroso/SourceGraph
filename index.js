
var each = require('foreach/async')
var when = require('result').when
var File = require('./file')

module.exports = graph

/**
 * parse a project from its entry file
 *
 * @param {String} file
 * @return {Array}
 */

function graph(file){
  if (!(file instanceof File)) file = new File(file, {})
  var seen = {}
  var out = []
  function trace(file){
    if (seen[file.id]) return
    seen[file.id] = file
    out.push(file)
    return each(file.children, trace)
  }
  return when(trace(file), function(){
    return out.map(function(file){ return file.toJSON() })
  })
}
