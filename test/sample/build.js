var fs = require('fs'),
    Graph = require('../../src/index.js'),
    p = require('path').resolve(__dirname, '../fixtures/cc/with_deps/component.json');

new Graph()
	.trace(p)
	.then(function (d) {
		debugger
	})