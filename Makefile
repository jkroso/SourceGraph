all: test

install: 
	@npm install

colony:
	@node_modules/.bin/colony src/index.js -r Readme.md -s 2

test:
	@node_modules/.bin/mocha -t 30000 test/graph.test.js

debug:
	@node_modules/.bin/mocha debug -t 3000s test/graph.test.js

inspect:
	@node_modules/.bin/mocha --debug-brk -t 3000s test/graph.test.js

Readme.md: src/index.js docs/head.md docs/tail.md
	@cat docs/head.md > Readme.md
	@cat src/index.js | dox -a >> Readme.md
	@cat docs/tail.md >> Readme.md

.PHONY: test clean build all build-test colony