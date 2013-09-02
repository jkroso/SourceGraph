REPORTER=dot

test: node_modules
	@node_modules/mocha/bin/_mocha \
		--reporter $(REPORTER) \
		--timeout 0 \
		--slow 3s \
		--bail \
		test/*.test.js

node_modules: package.json
	@packin install -Re \
		--meta package.json \
		--folder node_modules

.PHONY: test