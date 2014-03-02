
module.exports = function(css){
  var tag = JSON.stringify('<style>' + css + '</style>')
  return ''
    + 'var domify = require("' + require.resolve('domify') + '")\n'
    + 'document.head.appendChild(domify(' + tag + '))\n'
}
