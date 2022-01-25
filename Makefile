node_version:=$(shell node -v)
yarn_version:=$(shell npx yarn -v)
timeStamp:=$(shell date +%Y%m%d%H%M%S)


.PHONY: install build archive test clean

show:
		@ echo Timestamp: "$(timeStamp)"
		@ echo Node Version: $(node_version)
		@ echo yarn_version: $(yarn_version)

install:
		@ npx yarn install
		@ ./node_modules/.bin/grunt build:production

archive:
		@ tar -czvf "dosetup-$(timeStamp).tar.gz" dist

test:
		echo "test the app"
		@ npx yarn run test

clean:
		echo "cleaning the dist directory"
		@ rm -rf dist
		@ rm -rf dist.tar.gz

INFO := @bash -c '\
  printf $(YELLOW); \
  echo "=> $$1"; \
printf $(NC)' SOME_VALUE
