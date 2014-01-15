REPORTER=dot

test: node_modules
	@node_modules/mocha/bin/mocha test/*.test.js \
		--reporter $(REPORTER) \
		--timeout 0 \
		--slow 3s \
		--bail

node_modules: package.json
	@packin install \
		--meta package.json \
		--folder node_modules

.PHONY: test