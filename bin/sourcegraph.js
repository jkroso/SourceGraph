#!/usr/bin/env node

var program = require('commander')
  , Graph = require('..')
  , path = require('path')
  , fs = require('fs')
  , all = require('when-all')
  , unique = require('unique')
  , debug = require('debug')('sourcegraph:cli')

require('colors')

program.version(require('../package').version)
	.usage('[options] <entry files...> usually there is only one')
	.option('-p, --plugins <plugins...>', 'A comma separated list of plugins', list)
	.option('-b, --beautify', 'present the output for humans')
	.option('-l, --list-files', 'list all files in the graph')
	.option('-m, --menu', 'list available plugins')
	.option('-d, debug', 'sourcegraph takes any of node\'s debug options')

function list (args) {
	return args.split(',')
}

program.on('--help', function () {
	write('  Examples: \n')
	write('\n')
	write('    # basic (outputs a list of file objects)\n')
	write('    $ '.blue + 'sourcegraph examples/husband.js -p javascript\n')
	write('\n')
})

program.parse(process.argv)

// display available plugins
if (program.menu) (function(){
	var list = fs.readdirSync(path.resolve(__dirname, '../src/plugins'))
	console.log('')
	console.log('  Available plugins: \n%s', render(list))
	console.log('')

	function removeExt (file) {
		return file.replace(/\.js$/, '')
	}
	function render (list) {
		return renderJSON(list.map(removeExt).sort()).replace(/^/gm, '    ')
	}
	process.exit(0)
})()

var graph = new Graph

if (!program.plugins) {
	console.warn('You should probably specify at least one plugin')
} else {
	program.plugins.forEach(function (plugin) {
		console.warn('Install plugin: %s'.blue, plugin)
		graph.use(plugin)
	})
}

if (!program.args) {
	console.warn('You need to provide at least on entry file')
	process.exit(0)
}

// Convert to absolute paths
var files = program.args.map(function(file){
	return path.resolve(file)
})

var pending = files.map(function(file){
	console.warn(('Tracing from file: %s').green, file)
	return graph.add(file)
})

all(pending).then(function(files){
	// there all the same object so pick any one
	files = files[0]
	var paths = Object.keys(files)

	// print
	if (program.listFiles) {
		if (program.beautify) write(JSON.stringify(paths, null, 2))
		else write(JSON.stringify(paths, null, 2))
	} else {
		// to array
		files = paths.map(function(path){ return files[path] })
		write(JSON.stringify(unique(files), null, 2))
	}

	write('\n')
}).throw()

function write(s){
	process.stdout.write(s)
}
