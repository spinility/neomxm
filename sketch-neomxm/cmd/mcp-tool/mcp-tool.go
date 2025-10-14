package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/client/transport"
	"github.com/mark3labs/mcp-go/mcp"
	sketchmcp "sketch.dev/mcp"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// Set up basic logging
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
		Level: slog.LevelWarn,
	})))

	if len(os.Args) < 2 {
		return fmt.Errorf("usage: %s <discover|call> [options]", os.Args[0])
	}

	command := os.Args[1]
	switch command {
	case "discover":
		return runDiscover(os.Args[2:])
	case "call":
		return runCall(os.Args[2:])
	default:
		return fmt.Errorf("unknown command %q. Available commands: discover, call", command)
	}
}

func runDiscover(args []string) error {
	fs := flag.NewFlagSet("discover", flag.ExitOnError)
	mcpConfig := fs.String("mcp", "", "MCP server configuration as JSON")
	timeout := fs.Duration("timeout", 30*time.Second, "Connection timeout")
	verbose := fs.Bool("v", false, "Verbose output")

	fs.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s discover -mcp '{...}' [options]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "\nOptions:\n")
		fs.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nExample:\n")
		fmt.Fprintf(os.Stderr, " %s discover -mcp '{\"name\": \"test\", \"type\": \"stdio\", \"command\": \"./test-server\"}' -v\n", os.Args[0])
	}

	if err := fs.Parse(args); err != nil {
		return err
	}

	if *mcpConfig == "" {
		fs.Usage()
		return fmt.Errorf("-mcp flag is required")
	}

	if *verbose {
		slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})))
	}

	ctx, cancel := context.WithTimeout(context.Background(), *timeout)
	defer cancel()

	// Parse the MCP server configuration
	var serverConfig sketchmcp.ServerConfig
	if err := json.Unmarshal([]byte(*mcpConfig), &serverConfig); err != nil {
		return fmt.Errorf("failed to parse MCP config: %w", err)
	}

	if serverConfig.Name == "" {
		return fmt.Errorf("server name is required in MCP config")
	}

	// Connect to the MCP server
	mcpClient, err := connectToMCPServer(ctx, serverConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to MCP server: %w", err)
	}
	defer mcpClient.Close()

	// List available tools
	toolsReq := mcp.ListToolsRequest{}
	toolsResp, err := mcpClient.ListTools(ctx, toolsReq)
	if err != nil {
		return fmt.Errorf("failed to list tools: %w", err)
	}

	// Output the tools
	fmt.Printf("MCP Server: %s\n", serverConfig.Name)
	fmt.Printf("Available tools (%d):\n\n", len(toolsResp.Tools))

	for _, tool := range toolsResp.Tools {
		fmt.Printf("• %s\n", tool.Name)
		if tool.Description != "" {
			fmt.Printf("  Description: %s\n", tool.Description)
		}
		if tool.InputSchema.Type != "" {
			schemaBytes, err := json.MarshalIndent(tool.InputSchema, "  ", "  ")
			if err == nil {
				fmt.Printf("  Input Schema:\n  %s\n", string(schemaBytes))
			}
		}
		fmt.Println()
	}

	return nil
}

func runCall(args []string) error {
	fs := flag.NewFlagSet("call", flag.ExitOnError)
	mcpConfig := fs.String("mcp", "", "MCP server configuration as JSON")
	timeout := fs.Duration("timeout", 30*time.Second, "Connection and call timeout")
	verbose := fs.Bool("v", false, "Verbose output")

	fs.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s call -mcp '{...}' <tool_name> [tool_args_json]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "\nOptions:\n")
		fs.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nExample:\n")
		fmt.Fprintf(os.Stderr, " %s call -mcp '{\"name\": \"test\", \"type\": \"stdio\", \"command\": \"./test-server\"}' list_files '{\"path\": \"/tmp\"}'\n", os.Args[0])
	}

	if err := fs.Parse(args); err != nil {
		return err
	}

	if *mcpConfig == "" {
		fs.Usage()
		return fmt.Errorf("-mcp flag is required")
	}

	remainingArgs := fs.Args()
	if len(remainingArgs) < 1 {
		fs.Usage()
		return fmt.Errorf("tool name is required")
	}

	toolName := remainingArgs[0]
	var toolArgsJSON string
	if len(remainingArgs) > 1 {
		toolArgsJSON = remainingArgs[1]
	} else {
		toolArgsJSON = "{}"
	}

	if *verbose {
		slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})))
	}

	ctx, cancel := context.WithTimeout(context.Background(), *timeout)
	defer cancel()

	// Parse the MCP server configuration
	var serverConfig sketchmcp.ServerConfig
	if err := json.Unmarshal([]byte(*mcpConfig), &serverConfig); err != nil {
		return fmt.Errorf("failed to parse MCP config: %w", err)
	}

	if serverConfig.Name == "" {
		return fmt.Errorf("server name is required in MCP config")
	}

	// Parse tool arguments
	var toolArgs map[string]any
	if err := json.Unmarshal([]byte(toolArgsJSON), &toolArgs); err != nil {
		return fmt.Errorf("failed to parse tool arguments JSON: %w", err)
	}

	// Connect to the MCP server
	mcpClient, err := connectToMCPServer(ctx, serverConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to MCP server: %w", err)
	}
	defer mcpClient.Close()

	// Call the tool
	req := mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Name:      toolName,
			Arguments: toolArgs,
		},
	}

	if *verbose {
		fmt.Fprintf(os.Stderr, "Calling tool %q with arguments: %s\n", toolName, toolArgsJSON)
	}

	resp, err := mcpClient.CallTool(ctx, req)
	if err != nil {
		return fmt.Errorf("tool call failed: %w", err)
	}

	// Output the result
	result, err := json.MarshalIndent(resp.Content, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to format response: %w", err)
	}

	fmt.Printf("Tool call result:\n%s\n", string(result))
	return nil
}

// connectToMCPServer creates and initializes an MCP client connection
func connectToMCPServer(ctx context.Context, config sketchmcp.ServerConfig) (*client.Client, error) {
	var mcpClient *client.Client
	var err error

	// Convert environment variables to []string format
	var envVars []string
	for k, v := range config.Env {
		envVars = append(envVars, k+"="+v)
	}

	switch config.Type {
	case "stdio", "":
		if config.Command == "" {
			return nil, fmt.Errorf("command is required for stdio transport")
		}
		mcpClient, err = client.NewStdioMCPClient(config.Command, envVars, config.Args...)
	case "http":
		if config.URL == "" {
			return nil, fmt.Errorf("URL is required for HTTP transport")
		}
		// Use streamable HTTP client for HTTP transport
		var httpOptions []transport.StreamableHTTPCOption
		if len(config.Headers) > 0 {
			httpOptions = append(httpOptions, transport.WithHTTPHeaders(config.Headers))
		}
		mcpClient, err = client.NewStreamableHttpClient(config.URL, httpOptions...)
	case "sse":
		if config.URL == "" {
			return nil, fmt.Errorf("URL is required for SSE transport")
		}
		var sseOptions []transport.ClientOption
		if len(config.Headers) > 0 {
			sseOptions = append(sseOptions, transport.WithHeaders(config.Headers))
		}
		mcpClient, err = client.NewSSEMCPClient(config.URL, sseOptions...)
	default:
		return nil, fmt.Errorf("unsupported MCP transport type: %s", config.Type)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create MCP client: %w", err)
	}

	// Start the client
	if err := mcpClient.Start(ctx); err != nil {
		return nil, fmt.Errorf("failed to start MCP client: %w", err)
	}

	// Initialize the client
	initReq := mcp.InitializeRequest{
		Params: mcp.InitializeParams{
			ProtocolVersion: mcp.LATEST_PROTOCOL_VERSION,
			Capabilities:    mcp.ClientCapabilities{},
			ClientInfo: mcp.Implementation{
				Name:    "mcp-tool",
				Version: "1.0.0",
			},
		},
	}
	if _, err := mcpClient.Initialize(ctx, initReq); err != nil {
		return nil, fmt.Errorf("failed to initialize MCP client: %w", err)
	}

	return mcpClient, nil
}
