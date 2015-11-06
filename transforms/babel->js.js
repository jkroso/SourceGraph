var babel = require('babel-core')
var stages = [
  require('babel-preset-stage-0'),
  require('babel-preset-stage-1'),
  require('babel-preset-stage-2'),
  require('babel-preset-stage-3'),
  require('babel-preset-es2015'),
]
var plugins = [
  require('babel-plugin-syntax-jsx'),
  require('jsx-to-js').babel_plugin,
]

module.exports = function(es6, path, options) {
  options = Object.create(options || null)
  var stage = typeof options.stage == 'number' ? options.stage : 4
  options.filename = path
  options.presets = (options.presets || []).concat(stages[stage])
  options.plugins = (options.plugins || []).concat(plugins)
  return babel.transform(es6, options).code
}
