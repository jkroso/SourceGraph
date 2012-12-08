var find = require('lodash').find
var core = require('path').resolve(__dirname, '../node_modules') + '/'

module.exports = [
    function node_modules (hash, base, name) {
        if (hash[core+name+'.js']) return hash[core+name+'.js']
        return find(
            [
                name,
                name+'.js',
                name+'.json',
                name+'/index.js',
                name+'/index.json',
                name+'/package.json',
            ]
            .map(function (p) {
                return base+'/node_modules/'+p
            }),
            function (p) {
                return !!hash[p]
            }
        )
    },
    function components (hash, base, name) {
        return find(
            [
                // Check for an alias...
                name,
                // ...and a real component
                name+'/component.json'
            ]
            .map(function (p) {
                return base+'/components/'+p
            }),
            function (p) {
                return !!hash[p]
            }
        )
    }
]