
module.exports = function(css){
  var tag = JSON.stringify('<script>' + css + '<\\/script>')
  return ''
    + 'var domify = require("' + require.resolve('domify') + '")\n'
    + 'document.head.appendChild(domify(' + tag + '))\n'
}
