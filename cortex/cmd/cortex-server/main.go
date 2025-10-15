package main

import (
	"flag"
	"log"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/spinility/sketch-neomxm/cortex"
	"github.com/spinility/sketch-neomxm/llm/ant"
)

func main() {
	addr := flag.String("addr", ":8181", "Server address")
	flag.Parse()

	// Load configuration
	config := cortex.LoadConfigFromEnv()

	slog.Info("Starting Cortex server",
		"addr", *addr,
		"cortex_enabled", config.Enabled,
		"profiles_dir", config.ProfilesDir,
	)

	// Create a dummy LLM service (cortex will use ModelRouter instead)
	// This is just for compatibility with the Cortex constructor
	dummyService := &ant.Service{
		APIKey: config.APIKeys.Anthropic,
		Model:  "claude-sonnet-4",
	}

	// Create cortex
	cortexSystem, err := cortex.NewCortex(config, dummyService)
	if err != nil {
		log.Fatalf("Failed to create cortex: %v", err)
	}

	// Create HTTP server
	server := cortex.NewServer(cortexSystem, *addr)

	// Handle graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		slog.Info("Shutting down cortex server...")
		os.Exit(0)
	}()

	// Start server
	slog.Info("Cortex server ready", "addr", *addr)
	if err := server.Start(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
