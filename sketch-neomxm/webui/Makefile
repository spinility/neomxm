all: install check

install:
	npm ci
	npm run playwright-install

demo:
	npm run demo

dev:
	npm run dev

# TypeScript type checking and linting
# Note: The actual esbuild bundling happens in esbuild.go
check:
	npm test

clean:
	rm -rf node_modules
