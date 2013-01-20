
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
      "base" : "/home/jkroso/Dev/node/SourceGraph/example",
      "name" : "wife",
      "children" : [
         "/home/jkroso/Dev/node/SourceGraph/example/children/index.js"
      ],
      "path" : "/home/jkroso/Dev/node/SourceGraph/example/wife.js",
      "lastModified" : 1358066575000,
      "text" : "require('./children')",
      "requires" : [
         "./children"
      ],
      "id" : 2,
      "ext" : "js",
      "parents" : [
         "/home/jkroso/Dev/node/SourceGraph/example/husband.js"
      ]
    }


Or for fun you can turn sourcegraph on itself with this command

      $ sourcegraph src/index.js --plugins=javascript,nodeish

However, I haven't implemented the node plugin to include all core node modules (hence why its called node_ish_) so it ends up missing some out. You could implement a plugin though that enabled you to build node projects properly which might be a nice way to package code you publish.

## API

```javascript
var Graph = require('sourcegraph')
```
