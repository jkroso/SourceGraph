Most module systems depend on producers hard wiring names to the modules they write. A tool such a npm or component/component will then provide some magic so consumers can import this module simply by requiring it by the name the producer gave it. I believe this model of packaging code is over complicated and requires commitment from users. This makes code sharing difficult in the long run. This tool is a small piece of my solution to this problem. Its job is to hunt down dependencies and create file objects representing them.

Out of the box it will handle the semantics of node and component/component tools along with what I believe is a much better way to require a dependency, a url or a path.

An example of this tools output is:

```javascript
{ 	
	'/test/fixtures/kitchen/components/component-emitter/component.json': { 
		base: '/test/fixtures/kitchen/components/component-emitter',
     	text: '{\n  "name": "emitter",\n  "descripti... (length: 217)',
     	name: 'component',
     	ext: '.json',
     	lastModified: 1354273343000,
     	path: '/test/fixtures/kitchen/components/componen... (length: 104)' 
    },
  	'/test/fixtures/kitchen/tip.htempl': 
    { 
    	base: '/test/fixtures/kitchen',
     	text: '<div class="tip tip-hide">\n  <div clas... (length: 97)',
     	name: 'tip',
     	ext: '.htempl',
     	lastModified: 1351629837000,
     	path: '/test/fixtures/kitchen/tip.htempl'
    },
...and so on
```

Documentation to come