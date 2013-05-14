
# sourcegraph

  pull you modular project into memory so you can get fancy with it

## Getting Started

_With npm_  

	$ npm install -g sourcegraph

## Data format

  the command line version of sourcegraph outputs a JSON array of file objects as its representation of your project. Each object contains the following infomation:

+ path: an absolute path
+ text: the files content
+ lastModified: timestamp
+ requires: raw dependency calls e.g. ["./dep1.jade", "dep2"]
+ parents: absolute paths to files depending on this one
+ children: requires expanded to their fully resolved paths
+ aliases: symlinks pointing to this file

## API

### command line

	  Usage: sourcegraph.js [options] <entry files...>
		
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