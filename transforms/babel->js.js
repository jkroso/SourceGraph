var babel = require('babel')

module.exports = function(es6, options) {
  return babel.transform(es6, options).code
}
