
# sourcegraph

  Sourcegraph takes an entry file and walks its dependency graph recursively to produce a graph data structure. This should make it easy to introspect your project or compile production builds etc..

  Its similar to [module-deps](https://github.com/substack/module-deps) and is even API compatable in a lot of ways but doesn't limit itself by trying hopelessly to stream everything.

## Installation

```sh
$ npm install sourcegraph [--global]
```

## API

```js
var graph = require('sourcegraph')
```

### graph(entry)

  takes an entry path and returns an `Array` of file objects

```js
graph(__dirname + '/index.js')
```

## CLI

```sh
$ sourcegraph index.js
```

## Data format

each file objects looks like this:

```js
{
  id: "/full/path/to/index.js",
  source: 'the files source transpiled to JS according to its packages specification',
  deps: {
    "./dep1": "/full/path/to/dep1.js",
    "dep2": "/full/path/to/node_modules/dep2"
  },
  aliases: [
    '/any/relavant/symlinks/pointing/to/this/file'
  ]
}
```