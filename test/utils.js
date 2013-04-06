
var fs = require('fs')

/**
 * Helper for checking graphs creating graphs and checking 
 * they contain what they should
 *
 * @param {Array} files, the first path should be the entry file
 * @return {Promise} for completion
 */

exports.run = function(graph, files, extra){
	return graph.add(files[0]).then(function(data) {
		Object.keys(data).should.have.a.lengthOf(files.length + (extra || 0))
		files.forEach(function (path) {
			data.should.have.property(path)
				.and.property('text', fs.readFileSync(path, 'utf-8'))
		})
		return data
	})
}

exports.read = function(path){
	return fs.readFileSync(path, 'utf-8').toString()
}
