
var Graph = require('..')

/*!
 * The main file of the program
 */
var entry = __dirname + '/husband.js';

var dirRegex = new RegExp('^'+__dirname);

new Graph()
  .use('javascript')
  .add(entry)
  .then(function (files) {
    Object.keys(files).forEach(function (file) {
      file = files[file]
      file.base = file.base.replace(dirRegex, '')
      file.path = file.path.replace(dirRegex, '')
      file.children = file.children.map(function (path) {
        return path.replace(dirRegex, '')
      })
      file.parents = file.parents.map(function (path) {
        return path.replace(dirRegex, '')
      })
    })
    console.log(JSON.stringify(files, null, 2))
  })