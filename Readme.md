
# SourceGraph

SourceGraph is a tool to help resolve your projects dependencies. It plays the role of a framework by providing the machinery that is common to all dependency resolving systems. You just need to to it how to figure out what one file in your language of choice depends on and it will run with it and come back with a full array of the files depended on by your project. It isn't limited to just one language at a time though. You can teach it about as languages as you like an it will pull them all together no problem. For example Javascript and coffeescript are often used together but require a compilate step so the process is a bit clunky. Sourcegraph doesn't care about the language so long as you have provided it with a function to call for each. When combined with a compilation tool you have a complete build solution which is completly felxible. You will be able to mix and match languages, always able to pick the best tool for the job.

## Installation

    $ npm install sourcegraph -g

## Example

    $ sourcegraph example/simple/simple.js -b

Produces an Array of module object looking a bit like this:

    - 
      path:         /wife.js
      text:         require('./children')
      parents: 
        - /husband.js
      children: 
        - /children/index.js
      base:         
      ext:          js
      name:         wife
      lastModified: 1358066575000
      requires: 
        - ./children
      id:           2

## API

```javascript
var Graph = require('sourcegraph')
```
  - [Graph()](#graph)
  - [proto.addType()](#protoaddtypeconstructorfunction)
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

### proto.addType(constructor:Function)

  Add a module definition. 
  This is simply a constructor but it should have at least two functions associated with it. One is the requires function which should be an instance method that returns an Array of paths to the modules dependencies. The other is a "class method" defined under the property test. This is what is used to determine if this is a suitable type for a file. It will be passed a file object with {path:..., text:...} properties. `test` should return an Interger from 0 to Infinity based on how suitable the given file is for the module type. 0 meaning not suitable at all and Infinity meaning your absolutely certain.
  
  Example definition of a Javascript module type:
  
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
