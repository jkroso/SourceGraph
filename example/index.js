
var graph = require('..')

var entry = __dirname + '/husband.js'

graph(entry).read(function(files){
  console.log(JSON.stringify(files, null, 2))
})
