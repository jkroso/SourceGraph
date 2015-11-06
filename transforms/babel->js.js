var babel = require('babel-core')

var presets = [require('babel-preset-es2015')]
var plugins = [
  require('babel-plugin-syntax-jsx'),
  require('jsx-to-js').babel_plugin,
]

module.exports = function(es6, path, options) {
  options = Object.create(options || null)
  options.filename = path
  options.presets = (options.presets || []).concat(presets)
  options.plugins = (options.plugins || []).concat(plugins)
  return babel.transform(es6, options).code
}
