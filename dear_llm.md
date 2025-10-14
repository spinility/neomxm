Sketch is an agentic coding tool with a two-layer architecture:

1. Outer sketch: CLI command running on user's machine
2. Inner sketch: Binary running inside Docker containers for isolated work

Both layers use the same entrypoint (cmd/sketch). Outer sketch sets up containerization and starts inner sketch. Changes made in inner sketch are pushed via git to outer sketch.

## Core Packages

- termui, webui: both interfaces operate at all times
- loop: state machine that manages agent conversation flow

## Development Guidelines

- Do NOT git add or modify .gitignore, makefiles, or executable binaries unless requested
- When adding, removing, or changing tools, update both termui and webui
- Unless explicitly requested, do not add backwards compatibility shims. Just change all the relevant code.

## Building

You can build the sketch binary with "make". The webui directory has some
standalone "npm run dev" capability, but the main build is "make".

## Meta

The program you are working on is Sketch. The program you are running is
Sketch. This can be slightly confusing: Carefully distinguish the prompt and
tools you have from the codebase you are working on. Modifying the code does
not change your prompt or tools.

To start a copy of sketch, if you don't have an ANTHROPIC_API_KEY in your env
already, you can use:

  ANTHROPIC_API_KEY=fake sketch -skaband-addr= -addr ":8080" -unsafe

To browse the copy of sketch you just started, browse to localhost:8080.

## Testing

- Do NOT use the testify package. Write tests using the standard Go testing library only.

## Frontend Guidelines

- Always use relative URLs in frontend code (e.g., "./git/head" instead of "/git/head") to ensure proper routing through proxies.
- Always use Go structs for input and output types of JSON HTTP requests and use go2ts
  to convert them to typescript.
