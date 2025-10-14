# mcp-tool

A command-line tool for testing MCP (Model Context Protocol) servers. Uses the
same `mcp-go` library as Sketch to provide manual testing capabilities for MCP
server implementations.

## Usage

### Discover Tools

List all tools available from an MCP server:

```bash
mcp-tool discover -mcp '{"name": "server-name", "type": "stdio", "command": "./server"}'
```

### Call Tools

Invoke a specific tool on an MCP server:

```bash
mcp-tool call -mcp '{"name": "server-name", "type": "stdio", "command": "./server"}' tool_name '{"arg1": "value1"}'
```

## MCP Server Configuration

The `-mcp` flag accepts a JSON configuration with the following fields:

- `name` (required): Server name for identification
- `type`: Transport type - "stdio" (default), "http", or "sse"
- `command`: Command to run (for stdio transport)
- `args`: Array of command arguments (for stdio transport)
- `url`: Server URL (for http/sse transport)
- `env`: Environment variables as key-value pairs (for stdio transport)
- `headers`: HTTP headers as key-value pairs (for http/sse transport)

## Examples

### Stdio Transport

```bash
# Test a Python MCP server
mcp-tool discover -mcp '{"name": "python-server", "type": "stdio", "command": "python3", "args": ["server.py"]}'

# Call a tool with arguments
mcp-tool call -mcp '{"name": "python-server", "type": "stdio", "command": "python3", "args": ["server.py"]}' list_files '{"path": "/tmp"}'
```

### HTTP Transport

```bash
# Discover tools from HTTP MCP server
mcp-tool discover -mcp '{"name": "http-server", "type": "http", "url": "http://localhost:8080/mcp"}'

# Call with custom headers
mcp-tool call -mcp '{"name": "http-server", "type": "http", "url": "http://localhost:8080/mcp", "headers": {"Authorization": "Bearer token"}}' get_data '{}'
```

### SSE Transport

```bash
# Use Server-Sent Events transport
mcp-tool discover -mcp '{"name": "sse-server", "type": "sse", "url": "http://localhost:8080/mcp/sse"}'
```

## Options

- `-v`: Verbose output for debugging
- `-timeout duration`: Connection timeout (default: 30s)

## Testing

A test MCP server (`test-mcp-server.py`) is provided in the repository root for testing purposes. It implements basic tools like `echo`, `list_files`, and `get_env`:

```bash
# Start the test server and test it
mcp-tool discover -mcp '{"name": "test", "type": "stdio", "command": "python3", "args": ["test-mcp-server.py"]}'
mcp-tool call -mcp '{"name": "test", "type": "stdio", "command": "python3", "args": ["test-mcp-server.py"]}' echo '{"message": "Hello MCP!"}'
```
