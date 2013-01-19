
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
