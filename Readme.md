## Todo

- [x] Come up with a decent plugin system
- [x] Make plugins easy to consume e.g. `.use('node')` 
- [ ] Improve the level of parrallel loading
- [ ] Add a watch system with event emitter
- [x] Store child files on files
- [x] Store require statements on files
- [x] Switch plugins to simply be constructors
- [x] Use a test instance method to figure out if a Module type
-     matches a file. This method should return a interger score
- [x] Store parent file information on files

# SourceGraph

SourceGraph is a tool to help resolve your projects dependencies. It plays the role of a framework by providing the machinery that is common to all dependency resolving systems. You just need to to it how to figure out what one file in your language of choice depends on and it will run with it and come back with a full array of the files depended on by your project. It isn't limited to just one language at a time though. You can teach it about as languages as you like an it will pull them all together no problem. For example Javascript and coffeescript are often used together but require a compilate step so the process is a bit clunky. Sourcegraph doesn't care about the language so long as you have provided it with a function to call for each. When combined with a compilation tool you have a complete build solution which is completly felxible. You will be able to mix and match languages, always able to pick the best tool for the job.

## Installation

`$ npm install sourcegraph -g`

## Example

  $ sourcegraph example/simple/simple.js -b

Produces:

```
- 
  path:         /husband.js
  base:         
  ext:          js
  name:         husband
  text:         require('./wife')
  lastModified: 1358066519000
  id:           1
  requires: 
    - ./wife
- 
  path:         /wife.js
  base:         
  ext:          js
  name:         wife
  text:         require('./children')
  lastModified: 1358066575000
  id:           2
  requires: 
    - ./children
- 
  path:         /children/index.js
  base:         /children
  ext:          js
  name:         index
  text:         require('./tracy');require('./bow')
  lastModified: 1358068413000
  id:           3
  requires: 
    - ./tracy
    - ./bow
- 
  path:         /children/tracy.js
  base:         /children
  ext:          js
  name:         tracy
  text:         module.exports = 'mess'
  lastModified: 1358066646000
  id:           4
  requires: 
    (empty array)
- 
  path:         /children/bow.js
  base:         /children
  ext:          js
  name:         bow
  text:         module.exports = 'mess'
  lastModified: 1358066675000
  id:           5
  requires: 
    (empty array)
```


## API

```javascript
var Graph = require('sourcegraph')
```
  - [Graph()](#graph)
  - [proto.addType()](#protoaddtypetypeobject)
  - [proto.use()](#protousenamestring)
  - [proto.trace()](#prototraceentrystring)
  - [proto.then()](#protothencallbackfunctionfailfunction)
  - [proto.addModule()](#protoaddmodulebasestringpathstring)
  - [proto.add()](#protoaddpathstring)
  - [proto.insert()](#protoinsertmodulemodule)
  - [proto.get()](#protoget)
  - [proto.has()](#protohas)

### Graph()

  Graphs represent the complete source code of your program.
  They trace dependencies and give you a list of files at the end
  
```js
new Graph().trace('/path/to/my/project').then(function(files){
  files.forEach(function(file){
    console.log(file.text)
  })
})
```

### proto.addType(type:Object)

  Add a module definition. For example the definition of a javascript module
  looks a bit like this.
  
```js
graph.addType({
  if: /\.js$/
  make: function JS (file) {
    this.path = file.path
    this.text = file.text
  }
})
```

### proto.use(name:String...)

  Load a plugin

### proto.trace(entry,:String)

  Recursive version of `proto.add`

### proto.then(callback,:Function, fail,:Function)

  Retrieve the value of the sourcegraph

### proto.addModule(base:String, path:String)

  Add a module to the sourcegraph
  
```js
graph.add('/current/working/directory', 'super-module')
graph.add('/current/working/directory', 'http://code.com/super-module')
graph.add('/current/working/directory', '../super-module')
```

### proto.add(path:String)

  Add a file

### proto.insert(module:Module)

  Add a module to the sourcegraph

### proto.get()

  Retrieve the module stored within the sourcegraph

### proto.has()

  Is the file already listed in the sourcegraph

## Release History

_none yet_

## License
Copyright (c) 2012 Jakeb Rosoman

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
