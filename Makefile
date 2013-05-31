TESTS = $(shell ls -S `find test -type f -name "*.test.js" -print`)
TIMEOUT = 20000
MOCHA_OPTS =
REPORTER = tap
PROJECT_DIR = $(shell pwd)
JSCOVERAGE = ./node_modules/jscover/bin/jscover
NPM_REGISTRY = --registry=http://registry.npm.taobao.net
NPM_INSTALL_PRODUCTION = PYTHON=`which python2.6` NODE_ENV=production npm install $(NPM_REGISTRY)
NPM_INSTALL_TEST = PYTHON=`which python2.6` NODE_ENV=test npm install $(NPM_REGISTRY)

install:
	@$(NPM_INSTALL_PRODUCTION)

install-test:
	@$(NPM_INSTALL_TEST)

test: install-test
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) --timeout $(TIMEOUT) $(MOCHA_OPTS) $(TESTS)

test-cov:
	@$(MAKE) test MOCHA_OPTS='--require blanket' REPORTER=dot
	@$(MAKE) test MOCHA_OPTS='--require blanket' REPORTER=html-cov > $(PROJECT_DIR)/coverage.html

clean:
	@rm -f coverage.html

.PHONY: install install-test test test-cov clean
