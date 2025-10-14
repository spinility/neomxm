package main

import (
	"context"
	"os"
	"testing"
)

func TestExpandTilde(t *testing.T) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		t.Fatalf("Failed to get home directory: %v", err)
	}

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"tilde only", "~", homeDir},
		{"tilde with path", "~/Documents", homeDir + "/Documents"},
		{"no tilde", "/absolute/path", "/absolute/path"},
		{"tilde in middle", "/path/~/middle", "/path/~/middle"},
		{"relative path", "relative/path", "relative/path"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := expandTilde(tt.input)
			if err != nil {
				t.Errorf("expandTilde(%q) returned error: %v", tt.input, err)
			}
			if result != tt.expected {
				t.Errorf("expandTilde(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestSetupAndRunAgent_SetsPubKeyEnvVar(t *testing.T) {
	// Save original environment
	originalPubKey := os.Getenv("SKETCH_PUB_KEY")
	defer func() {
		if originalPubKey == "" {
			os.Unsetenv("SKETCH_PUB_KEY")
		} else {
			os.Setenv("SKETCH_PUB_KEY", originalPubKey)
		}
	}()

	// Clear the environment variable first
	os.Unsetenv("SKETCH_PUB_KEY")

	// Verify it's not set
	if os.Getenv("SKETCH_PUB_KEY") != "" {
		t.Fatal("SKETCH_PUB_KEY should not be set initially")
	}

	// Test data
	testPubKey := "test-public-key-123"

	// Create a minimal flags struct
	flags := CLIFlags{
		modelName: "claude",
	}

	// This should fail due to missing API key, but should still set the environment variable
	err := setupAndRunAgent(context.TODO(), flags, modelSpec{}, testPubKey, false, nil)

	// Check that the environment variable was set correctly
	if os.Getenv("SKETCH_PUB_KEY") != testPubKey {
		t.Errorf("Expected SKETCH_PUB_KEY to be %q, got %q", testPubKey, os.Getenv("SKETCH_PUB_KEY"))
	}

	// We expect this to fail due to missing API key, but that's fine for this test
	if err == nil {
		t.Error("Expected setupAndRunAgent to fail due to missing API key")
	}
}

func TestSetupAndRunAgent_DoesNotSetEmptyPubKey(t *testing.T) {
	// Save original environment
	originalPubKey := os.Getenv("SKETCH_PUB_KEY")
	defer func() {
		if originalPubKey == "" {
			os.Unsetenv("SKETCH_PUB_KEY")
		} else {
			os.Setenv("SKETCH_PUB_KEY", originalPubKey)
		}
	}()

	// Set a value first
	os.Setenv("SKETCH_PUB_KEY", "existing-value")

	// Create a minimal flags struct
	flags := CLIFlags{
		modelName: "claude",
	}

	// This should fail due to missing API key, but should not change the environment variable
	err := setupAndRunAgent(context.TODO(), flags, modelSpec{}, "", false, nil)

	// Check that the environment variable was not changed
	if os.Getenv("SKETCH_PUB_KEY") != "existing-value" {
		t.Errorf("Expected SKETCH_PUB_KEY to remain %q, got %q", "existing-value", os.Getenv("SKETCH_PUB_KEY"))
	}

	// We expect this to fail due to missing API key, but that's fine for this test
	if err == nil {
		t.Error("Expected setupAndRunAgent to fail due to missing API key")
	}
}
