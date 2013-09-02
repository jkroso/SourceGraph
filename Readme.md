
# sourcegraph

  Pull you modular project into memory so you can do stuff with it. sourcegraph is fairly hard working, it only asks for an entry file as input. It will add this file to the graph then figure out its dependencies and recur on those until no dependencies remain. In order to do this it needs to understand something about the type of files its walking. For this it uses plugins. For example the "nodeish" plugin teaches sourcegraph about javascript and json files.

  Its similar to [module-deps](https://github.com/substack/module-deps) for [browserify](https://github.com/substack/node-browserify) but isn't as specialized towards node.js projects and doesn't limit itself by trying hopelessly to stream everything.

## Getting Started

_With npm_  

	$ npm install -g sourcegraph

## Data format

  the command line version of sourcegraph outputs a JSON array of file objects as its representation of your project. Each object contains the following keys:

+ path: an absolute path
+ text: the files content
+ lastModified: timestamp
+ requires: raw dependency calls e.g. `["./dep1.jade", "dep2"]`
+ parents: absolute paths to files depending on this one
+ children: requires expanded to their fully resolved paths
+ aliases: symlinks pointing to this file

## Dependency resolution algorithm

  When sourcegraph runs into a dependency with no leading path delimiters and isn't a remote URL it considers this a "package lookup". Its package lookup procedure is almost identical to node.js's with the exception that it doesn't give built in modules any special priority (thats a feature). That is it will walk up the directory hierarchy from the directory the "package request" was made from and will look for the package under a specific sub-directory. By default this directory is "node_modules", though is configurable. So if a file at "/a/b/c.js" required package "d", sourcegraph would check

	/a/b/c/node_modules/d
	/a/b/node_modules/d
	/a/node_modules/d
	/node_modules/d

  if it gets to the last one without success it throws an error.

## API

### Graph()

  the Graph class

### Graph.add(path)

  add a file and it dependencies to `this` graph

### Graph.which(base, path)

  determine which file a `require(req)` from `dir`
  would result in. Only cached modules are considered

### Graph.get(base, path)

  Retrieve the module stored within the sourcegraph

### Graph.has(base, path)

  Is the file already listed in the sourcegraph

### Graph.clear()

  remove all files so the graph can be rebuilt

### Graph.addFSReader(fn)

  Add package resolver that operates over the filesystem

### Graph.addHashReader(fn)

  Add package resolver that operates over a file cache

### Graph.addType(fn)

  Add a module definition.

```js
function Javascript (file) {
  this.path = file.path
  this.text = file.text
  this.requires = function () {
    return detective(this.text)
  }
}
Javascript.test = function (file) {
  var match = file.path.match(/\.js$/)
  return match ? 1 : 0
}
graph.addType(Javascript)
```

### Graph.use(name:String|Object)

  Load a plugin. A plugin is just a grab bag of stuff

## Running the tests

```bash
$ make test
```

## License 

[MIT](License)