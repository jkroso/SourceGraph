# SourceGraph

Most module systems depend on producers hard wiring names to the modules they write. A tool such a npm or component/component will then provide some magic so consumers can import this module simply by requiring it by the name the producer gave it. I believe this model of packaging code is over complicated and requires commitment from users. This makes code sharing difficult in the long run. This tool is a small piece of my solution to this problem. Its job is to hunt down dependencies and create file objects representing them.

Out of the box it will handle the semantics of node and component/component tools along with what I believe is a much better way to require a dependency, a url or a path.

## Installation

`npm install sourcegraph`

npm doesn't currently do a very good job of handling github dependencies so you make have to install those individually with explicit commands for each.

## Example

See the example folder

Its output should look something like this on your machine:

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
## Todo

- [x] Come up with a decent plugin system
- [x] Make plugins easy to consume e.g. `.use('node')` 
- [ ] Improve the level of parrallel loading
- [ ] Consider adding a watch system

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
