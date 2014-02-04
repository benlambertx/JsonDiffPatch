build: bundle.min.js
bundle.js:
	@./node_modules/.bin/browserify ./src/main.js --debug --outfile bundle.js
	@echo bundle.js built
bundle.min.js: bundle.js
	@./node_modules/.bin/uglifyjs ./bundle.js > ./bundle.min.js
	@echo bundle.min.js built
clean:
	@rm -f bundle.js
	@rm -f bundle.min.js
	@echo cleaned
test:
	@./node_modules/.bin/mocha --reporter spec --recursive ./test
watch:
	@./node_modules/.bin/mocha --reporter spec --recursive ./test --watch --growl

.PHONY: clean test watch