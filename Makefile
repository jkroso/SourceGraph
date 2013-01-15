Reporter = dot

all: colony Readme.md

install: 
	@npm install

colony:
	@node_modules/.bin/colony src/index.js -r Readme.md -s 2

test:
	@node_modules/.bin/mocha test/*.test.js -R $(Reporter) -t 0

debug:
	@node_modules/.bin/mocha debug test/*.test.js -R $(Reporter) -t 0

inspect:
	@node_modules/.bin/mocha --debug-brk -test/*.test.js -R $(Reporter) -t 0

Readme.md: src/index.js docs/head.md docs/tail.md
	@cat docs/head.md > Readme.md
	@cat src/index.js | dox --api | sed s/^\#\#/\#\#\#/ >> Readme.md
	@cat docs/tail.md >> Readme.md

.PHONY: test clean build all build-test colony