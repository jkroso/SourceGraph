
var each = require('foreach/async')
var co = require('result-co')
var File = require('./file')
var merge = require('merge')

module.exports = co(graph)

/**
 * parse a project from its entry file
 *
 * @param {String} file
 * @param {Object} [options]
 * @return {Array}
 */

function* graph(file, opts){
  if (!(file instanceof File)) file = new File(file, {})
  file.opts = merge({env: 'browser'}, opts)
  var seen = {}
  var out = []
  yield function trace(file){
    if (seen[file.id]) return
    seen[file.id] = file
    out.push(file)
    return each(file.children, trace)
  }(file)
  return out.map(function(file){
    return file.toJSON()
  })
}
