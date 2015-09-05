var babel = require('babel-core')
var JSX = require('jsx-to-js')
var path = require('path')
var plugin = path.dirname(require.resolve('babel-plugin-jkroso-runtime/package'))

module.exports = function(es6, path, options) {
  options = Object.create(options || null)
  options.filename = path
  options.blacklist = (options.blacklist || []).concat('react')
  options.plugins = (options.plugins || []).concat(plugin)
  const ast = JSX(babel.parse(es6))
  return babel.transform.fromAst(ast, null, options).code
}
