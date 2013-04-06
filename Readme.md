
# sourcegraph

  pull you modular project into memory so you can get fancy with it

## Getting Started

_With npm_  

	$ npm install -g sourcegraph


## API

### command line

	  Usage: sourcegraph.js [options] <entry files...> usually there is only one
		
	  Options:
		
	    -h, --help                  output usage information
	    -V, --version               output the version number
	    -p, --plugins <plugins...>  A comma separated list of plugins
	    -b, --beautify              present the output for humans
	    -l, --list-files            list all files in the graph
	    -m, --menu                  list available plugins
	    -d, debug                   sourcegraph takes any of node's debug options
	
	  Examples: 
		
	    # basic (outputs a list of file objects)
	    $ sourcegraph examples/husband.js -p javascript

### programatic

TODO: document api

see bin/sourcegraph.js and index.js for now

## Running the tests

```bash
$ npm install
$ make
```

## License 

[MIT](License)