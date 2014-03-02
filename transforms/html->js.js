
module.exports = function(html){
  return ''
    + 'var domify = require("' + require.resolve('domify') + '")\n'
    + 'module.exports = domify(' + JSON.stringify(html) + ')\n'
}
