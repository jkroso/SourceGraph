REPORTER=dot

test:
	@node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 0 \
		--slow 3s \
		--bail \
		test/*.test.js

.PHONY: test