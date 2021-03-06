var babel = require('babel-core')

var es2015 = require('babel-preset-es2015')
var stages = [
  require('babel-preset-stage-0'),
  require('babel-preset-stage-1'),
  require('babel-preset-stage-2'),
  require('babel-preset-stage-3'),
]
var plugins = [
  require('babel-plugin-syntax-jsx'),
  require('jsx-to-js').babel_plugin,
  require('@jkroso/babel-plugin-runtime')
]

module.exports = function(es6, path, options) {
  options = Object.assign({}, options || null)
  options.filename = path
  if (typeof options.stage == 'number') {
    options.presets = (options.presets || []).concat(es2015)
    options.presets.push(stages[options.stage])
    delete options.stage
  }
  options.plugins = (options.plugins || []).concat(plugins)
  return babel.transform(es6, options).code
}
