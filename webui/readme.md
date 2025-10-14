# Loop WebUI

A modern web interface for the CodingAgent loop.

The server in the sibling directory (../server) exposes an HTTP API for
the CodingAgent.

## Development

This module contains a TypeScript-based web UI for the Loop service. The TypeScript code is compiled into JavaScript using esbuild, and the resulting bundle is served by the Go server.

### Prerequisites

- Node.js and npm
- Go 1.20 or later

### Setup

```bash
# Install dependencies
make install

# Run tests
make check
```

### Development Mode

For development, you can use watch mode:

```bash
make dev
```

This will launch a local web server at http://127.0.0.1:5173/ that serves the demo pages for the web components. You can edit the TypeScript files, and the changes will be reflected in real-time.

To access the main app shell interface on the dev server (the primary UI component for Sketch):

1. Start the dev server as above
2. Navigate to http://127.0.0.1:5173/src/web-components/demo/sketch-app-shell.demo.html
   or click on the "sketch-app-shell" link from the demo index page

### UI Component Demos

The development server provides access to individual component demos including:

- Main app shell: http://127.0.0.1:5173/src/web-components/demo/sketch-app-shell.demo.html
- Chat input: http://127.0.0.1:5173/src/web-components/demo/sketch-chat-input.demo.html
- Timeline: http://127.0.0.1:5173/src/web-components/demo/sketch-timeline.demo.html
- And more...

You can access these demos from the index page or navigate directly to the specific component demo URL.

#### VSCode

If you are using Visual Studio Code, you can use the `Launch Chrome against localhost` launch configuration to run the demo server. This configuration is set up to automatically open a sketch page with dummy data in Chrome when you start debugging, supporting hot module reloading and breakpoints.

## Integration with Go Server

The TypeScript code is bundled into JavaScript using esbuild and then served by the Go HTTP server. The integration happens through the `webui` package, which provides a function to retrieve the built bundle.

The server code accesses the built web UI through the `webui.GetBundle()` function, which returns a filesystem that can be used to serve the files.

## File Structure

- `src/`: TypeScript source files
- `dist/`: Generated JavaScript bundle
- `esbuild.go`: Go code for bundling TypeScript files
- `Makefile`: Build tasks

## Bundle Analysis

You can analyze the size and dependency structure of the TypeScript bundles:

```bash
# Generate bundle metafiles in a temporary directory
go run sketch.dev/cmd/bundle-analyzer
```

The tool generates metafiles that can be analyzed by dragging them onto the esbuild analyzer at https://esbuild.github.io/analyze/
