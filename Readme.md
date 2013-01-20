
# SourceGraph

SourceGraph is a __framework__ to help you do __static__ dependency analysis on your project no matter what language you use. To use it you just need to tell it how dependencies are included in each language you use. Look in the plugins directory for examples. This tool is useful if your language doesn't provide modularisation features natively and you need to bring your own such as in Javascript. Or if you would like to use __multiple languages__ on one project and need a way to integrating them. For example if your doing frontend development, Javascript, coffeescript, Stylus, and Jade might sound like a nice combination of languages to use. Sourcegraph will allow you to pull all your assets together. It outputs an array of file objects. These should then be passed into a compilation tool.  
Sourcegraph's job is information gathering. Compilation can be a simple thing if you only use one language, but it can also get messy if you use many. So your compile tool should focus on compilation.  
It hasn't yet been implemented but I plan to make sourcegraph a long running process which monitors your project as you write it. This would make it efficient to have a build step while still iterating quickly. Infact I'd expect you could easily outperform run time dependency resolving systems such as node or AMD with long running sourcegraph process combined with a short running compile step. Make your compile step also long running too ... you'll be iterating in as long as it takes to do one disk write and one disk read.

## Installation

    $ npm install sourcegraph -g

## Example

    $ sourcegraph example/husband.js --plugins=javascript --beautify

Produces an Array of module object looking a bit like this:

    {
      "base" : "/home/jkroso/Dev/Libraries/SourceGraph/example",
      "name" : "wife",
      "children" : [
        "/home/jkroso/Dev/Libraries/SourceGraph/example/children/index.js"
      ],
      "path" : "/home/jkroso/Dev/Libraries/SourceGraph/example/wife.js",
      "lastModified" : 1358066575000,
      "text" : "require('./children')",
      "requires" : [
        "./children"
      ],
      "id" : 2,
      "ext" : "js",
      "parents" : [
        "/home/jkroso/Dev/Libraries/SourceGraph/example/husband.js"
      ]
    }


Or for fun you can turn sourcegraph on itself with this command

      $ sourcegraph src/index.js --plugins=javascript,nodeish

However, I haven't implemented the node plugin to include all core node modules (hence why its called node_ish_) so it ends up missing some out. You could implement a plugin though that enabled you to build node projects properly which might be a nice way to package code you publish.

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
