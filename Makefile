
test: node_modules
	@node_modules/hydro/bin/hydro test/*.test.js \
		--setup test/hydro.conf.js \
		--harmony

node_modules: package.json
	@packin install --meta $< --folder $@

.PHONY: test
