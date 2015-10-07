var runtime = require('babel-plugin-jkroso-runtime')
var babel = require('babel-core')
var JSX = require('jsx-to-js')

module.exports = function(es6, path, options) {
  options = Object.create(options || null)
  options.filename = path
  options.blacklist = (options.blacklist || []).concat('react')
  options.plugins = (options.plugins || []).concat(JSX.babel_plugin, runtime)
  return babel.transform(es6, options).code
}
