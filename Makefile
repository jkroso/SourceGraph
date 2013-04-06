Reporter = dot

test:
	@node_modules/.bin/mocha -R $(Reporter) -t 0 --slow 3s

.PHONY: test