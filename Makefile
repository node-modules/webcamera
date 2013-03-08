TESTS = $(shell ls -S `find test -type f -name "*.test.js" -print`)
TIMEOUT = 20000
MOCHA_OPTS =
REPORTER = tap
PROJECT_DIR = $(shell pwd)
JSCOVERAGE = ./node_modules/jscover/bin/jscover
NPM_REGISTRY = --registry=http://registry.npm.taobao.net
NPM_INSTALL_PRODUCTION = PYTHON=`which python2.6` NODE_ENV=production npm install $(NPM_REGISTRY)
NPM_INSTALL_TEST = PYTHON=`which python2.6` NODE_ENV=test npm install $(NPM_REGISTRY)

check:
	@curl -s http://npm.taobao.org/version/check.sh | sh

install:
	@$(NPM_INSTALL_PRODUCTION)

install-test: check
	@$(NPM_INSTALL_TEST)

test: install-test
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) --timeout $(TIMEOUT) $(MOCHA_OPTS) $(TESTS)

lib-cov:
	@rm -rf lib-cov
	@$(JSCOVERAGE) ./lib ./lib-cov

test-cov: lib-cov
	@WEB_CAMERA_COV=1 $(MAKE) test REPORTER=dot
	@WEB_CAMERA_COV=1 $(MAKE) test REPORTER=html-cov > $(PROJECT_DIR)/coverage.html

clean:
	@rm -f coverage.html

.PHONY: install install-test test test-cov lib-cov clean toast check
