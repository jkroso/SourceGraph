var babel = require('babel-core')

module.exports = function(es6, path, options) {
  options = Object.create(options)
  options.filename = path
  return babel.transform(es6, options).code
}
