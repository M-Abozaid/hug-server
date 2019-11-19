node_version:=$(shell node -v)
npm_version:=$(shell npm -v)
timeStamp:=$(shell date +%Y%m%d%H%M%S)


.PHONY: install build archive test clean

show:
		@ echo Timestamp: "$(timeStamp)"
		@ echo Node Version: $(node_version)
		@ echo npm_version: $(npm_version)

install:
		@ npm install --unsafe-perm
		@ ./node_modules/.bin/grunt build:production

archive:
		@ tar -czvf "dosetup-$(timeStamp).tar.gz" dist

test:
		echo "test the app"
		@ npm run test

clean:
		echo "cleaning the dist directory"
		@ rm -rf dist
		@ rm -rf dist.tar.gz

INFO := @bash -c '\
  printf $(YELLOW); \
  echo "=> $$1"; \
printf $(NC)' SOME_VALUE
