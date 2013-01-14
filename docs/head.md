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
  path:         /home/jkroso/Dev/Libraries/SourceGraph/example/husband.js
  base:         /home/jkroso/Dev/Libraries/SourceGraph/example
  ext:          js
  name:         husband
  text:         require('./wife')
  lastModified: 1358066519000
  id:           1
  requires: 
    - ./wife
- 
  path:         /home/jkroso/Dev/Libraries/SourceGraph/example/wife.js
  base:         /home/jkroso/Dev/Libraries/SourceGraph/example
  ext:          js
  name:         wife
  text:         require('./children')
  lastModified: 1358066575000
  id:           2
  requires: 
    - ./children
- 
  path:         /home/jkroso/Dev/Libraries/SourceGraph/example/children/index.js
  base:         /home/jkroso/Dev/Libraries/SourceGraph/example/children
  ext:          js
  name:         index
  text:         require('./tracy');require('./bow')
  lastModified: 1358068413000
  id:           3
  requires: 
    - ./tracy
    - ./bow
- 
  path:         /home/jkroso/Dev/Libraries/SourceGraph/example/children/tracy.js
  base:         /home/jkroso/Dev/Libraries/SourceGraph/example/children
  ext:          js
  name:         tracy
  text:         module.exports = 'mess'
  lastModified: 1358066646000
  id:           4
  requires: 
    (empty array)
- 
  path:         /home/jkroso/Dev/Libraries/SourceGraph/example/children/bow.js
  base:         /home/jkroso/Dev/Libraries/SourceGraph/example/children
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
