test: node_modules
	@node_modules/hydro/bin/_hydro test/*.test.js \
		--setup test/hydro.conf.js \
		--harmony

node_modules: package.json
	@npm install

.PHONY: test
