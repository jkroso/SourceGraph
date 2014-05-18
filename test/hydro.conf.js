
var fs = require('fs')

/**
 * Hydro configuration
 *
 * @param {Hydro} hydro
 */

module.exports = function(hydro) {
  hydro.set({
    suite: 'sourcegraph',
    formatter: require('hydro-dot'),
    plugins: [
      require('hydro-file-suite'),
      require('hydro-focus'),
      require('hydro-chai'),
      require('hydro-bdd'),
      require('hydro-co')
    ],
    chai: {
      chai: require('chai'),
      styles: ['should'],
      stack: true
    },
    globals: {
      read: function(file){
        return fs.readFileSync(file, 'utf8')
      },
      fixture: function(name){
        return __dirname + '/fixtures/' + name
      }
    }
  })
}
