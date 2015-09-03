var babel = require('babel-core')
var path = require('path')
var JSX = require('JSX')
var plugin = path.dirname(require.resolve('babel-plugin-jkroso-runtime/package'))

module.exports = function(es6, path, options) {
  options = Object.create(options || null)
  options.filename = path
  options.blacklist = (options.blacklist || []).concat('react')
  options.plugins = (options.plugins || []).concat(plugin)
  return babel.transform.fromAst(JSX(es6), null, options).code
}
