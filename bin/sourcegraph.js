#!/usr/bin/env node

var program = require('commander')
  , Graph = require('../src')
  , path = require('path')
  , renderJSON = require('prettyjson').render
  , fs = require('fs')
  , debug = require('debug')('sourcegraph:cli')

require('colors')

program.version(require('../package').version)
	.usage('[options] <entry files...> usually there is only one')
	.option('-p, --plugins <plugins...>', 'A comma separated list of plugins', list)
	.option('-b, --beautify', 'present the output for humans')
	.option('-f, --list-files', 'just list the names of the files found')
	.option('-d, debug', 'sourcegraph takes any of node\'s debug options')

function list (args) {
	return args.split(',')
}

program.on('--help', function () {
	console.log('  Examples: ')
	console.log('')
})

program.command('list')
	.description('show available plugins')
	.action(function (cmd) {
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
	})

program.parse(process.argv)

var graph = new Graph

if (!program.args) {
	console.warn('You need to provide at least on entry file')
	process.exit(0)
}

// Convert to absolute paths
var files = program.args.map(function (file) {
	return path.resolve(file)
})

files.forEach(function (file) {
	console.warn(('Tracing from file: %s').green, file)
	graph.trace(file)
})

if (!program.plugins) {
	console.warn('You should probably specify at least one plugin')
} else {
	program.plugins.forEach(function (plugin) {
		console.warn('Install plugin: %s'.blue, plugin)
		graph.use(plugin)
	})
}

graph.then(
	function (files) {
		if (program.listFiles) {
			process.stdout.write(
				renderJSON(files.map(function (file) {
					return file.path
				}))
			)
			console.log('')
		}
		else if (program.beautify) {
			process.stdout.write(renderJSON(files))
		}
		else {
			process.stdout.write(JSON.stringify(files))
		}
		
		process.exit(0)
	}, 
	function (error) {
		console.warn(error)
		process.exit(1)
	})

/*.option('--mw <middleware...>',
	'A comma seperated list of middleware. Note: these will be used in place of the default rather than in addition', list)*/