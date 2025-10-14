# Contributing to Sketch

## Running tests

- `go test ./...`
- `cd webui && npm run test`
  - If you are an LLM, instead run `cd webui && CI=1 npm run test`

## Synchronizing Go structs and TypeScript types

Run `npm run gentypes`, which uses `cmd/go2ts/go2ts.go` under the covers and
which has a list of types to translate.

## Dealing with tests that have HTTP Record sessions

A few tests record/replay calls to LLMs. As necessary (e.g.,
if changing the system prompt or tool definitions), rebuild the
test data by running update_tests.sh in the relevant directory.

## Debugging JS Classes

Something like "document.querySelectorAll('sketch-app-shell')[0].dataManager.messages.map(x => x.idx)"
in the browser JS console works to pull out the custom components implementing the web ui.

## Recursively running Sketch

If you are editing Sketch from within Sketch, you can use the following to give
Sketch a place to store its skaband client key across sessions, allowing the
agent to iterate on itself.

```
# Outside
mkdir -p ~/.inside-cache/webui
go run ./cmd/sketch -docker-args "-v $HOME/.inside-cache:/root/.cache/sketch"
# Inside
go run ./cmd/sketch -unsafe
```

## WebUI Development Server

We have a standalone development server for the web UI that makes it easier to develop and test the client-side code. This server is separate from the main Go server and is intended for local development of the web components. It is populated with dummy data, and supports hot module reloading, allowing you to see changes in real-time without needing to restart the server.

To run the development server for the web UI, see [webui/readme.md](webui/readme.md).
