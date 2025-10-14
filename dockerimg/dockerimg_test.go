package dockerimg

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// TestDockerHashIsPushed tests that the published image hash is available
func TestDockerHashIsPushed(t *testing.T) {
	// Skip this test if we can't reach the internet
	if os.Getenv("CI") == "" {
		t.Skip("Skipping test that requires internet access")
	}

	if err := checkTagExists(dockerfileBaseHash()); err != nil {
		t.Errorf("Docker image tag %s not found: %v", dockerfileBaseHash(), err)
	}

	// Test that the default image components are reasonable
	name, dockerfile, tag := DefaultImage()
	if name == "" {
		t.Error("DefaultImage name is empty")
	}
	if dockerfile == "" {
		t.Error("DefaultImage dockerfile is empty")
	}
	if tag == "" {
		t.Error("DefaultImage tag is empty")
	}
	if len(tag) < 10 {
		t.Errorf("DefaultImage tag suspiciously short: %s", tag)
	}
}

// TestCreateCacheKey tests the cache key generation
func TestCreateCacheKey(t *testing.T) {
	key1 := createCacheKey("image1", "/path1")
	key2 := createCacheKey("image2", "/path1")
	key3 := createCacheKey("image1", "/path2")
	key4 := createCacheKey("image1", "/path1")

	// Different inputs should produce different keys
	if key1 == key2 {
		t.Error("Different base images should produce different cache keys")
	}
	if key1 == key3 {
		t.Error("Different paths should produce different cache keys")
	}

	// Same inputs should produce same key
	if key1 != key4 {
		t.Error("Same inputs should produce same cache key")
	}

	// Keys should be reasonably short
	if len(key1) != 12 {
		t.Errorf("Cache key length should be 12, got %d", len(key1))
	}
}

// TestEnsureBaseImageExists tests the base image existence check and pull logic
func TestEnsureBaseImageExists(t *testing.T) {
	// This test would require Docker to be running and would make network calls
	// So we'll skip it unless we're in an integration test environment
	if testing.Short() {
		t.Skip("Skipping integration test that requires Docker")
	}

	ctx := context.Background()

	// Test with a non-existent image (should fail gracefully)
	err := ensureBaseImageExists(ctx, "nonexistent/image:tag")
	if err == nil {
		t.Error("Expected error for nonexistent image, got nil")
	}
}

// TestBinaryCaching tests the content-addressable binary caching functionality
func TestBinaryCaching(t *testing.T) {
	// Mock the embedded binary
	testBinary := []byte("fake binary content for testing")

	// Calculate expected hash
	hash := sha256.Sum256(testBinary)
	hashHex := hex.EncodeToString(hash[:])

	// Create a temporary directory for this test
	tempDir := t.TempDir()
	cacheDir := filepath.Join(tempDir, "sketch-binary-cache")
	binaryPath := filepath.Join(cacheDir, hashHex)

	// First, create the cache directory
	err := os.MkdirAll(cacheDir, 0o755)
	if err != nil {
		t.Fatalf("Failed to create cache directory: %v", err)
	}

	// Verify the binary doesn't exist initially
	if _, err := os.Stat(binaryPath); !os.IsNotExist(err) {
		t.Fatalf("Binary should not exist initially, but stat returned: %v", err)
	}

	// Write the binary (simulating first time)
	err = os.WriteFile(binaryPath, testBinary, 0o700)
	if err != nil {
		t.Fatalf("Failed to write binary: %v", err)
	}

	// Verify the binary now exists and has correct permissions
	info, err := os.Stat(binaryPath)
	if err != nil {
		t.Fatalf("Failed to stat cached binary: %v", err)
	}

	if info.Mode().Perm() != 0o700 {
		t.Errorf("Expected permissions 0700, got %o", info.Mode().Perm())
	}

	// Verify content matches
	cachedContent, err := os.ReadFile(binaryPath)
	if err != nil {
		t.Fatalf("Failed to read cached binary: %v", err)
	}

	if !bytes.Equal(testBinary, cachedContent) {
		t.Error("Cached binary content doesn't match original")
	}

	// Test that the same hash produces the same path
	hash2 := sha256.Sum256(testBinary)
	hashHex2 := hex.EncodeToString(hash2[:])

	if hashHex != hashHex2 {
		t.Error("Same content should produce same hash")
	}

	// Test that different content produces different hash
	differentBinary := []byte("different fake binary content")
	differentHash := sha256.Sum256(differentBinary)
	differentHashHex := hex.EncodeToString(differentHash[:])

	if hashHex == differentHashHex {
		t.Error("Different content should produce different hash")
	}
}

func TestCollectGoModules(t *testing.T) {
	// Create a temporary directory with test files
	tempDir := t.TempDir()

	// Initialize a git repository
	cmd := exec.Command("git", "init", ".")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to init git repo: %v", err)
	}

	// Create test go.mod files
	modContent := "module test\n\ngo 1.19\n"
	sumContent := "example.com/test v1.0.0 h1:abc\n"

	// Root go.mod
	if err := os.WriteFile(filepath.Join(tempDir, "go.mod"), []byte(modContent), 0o644); err != nil {
		t.Fatalf("Failed to create go.mod: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tempDir, "go.sum"), []byte(sumContent), 0o644); err != nil {
		t.Fatalf("Failed to create go.sum: %v", err)
	}

	// Subdirectory go.mod
	subDir := filepath.Join(tempDir, "subdir")
	if err := os.MkdirAll(subDir, 0o755); err != nil {
		t.Fatalf("Failed to create subdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(subDir, "go.mod"), []byte(modContent), 0o644); err != nil {
		t.Fatalf("Failed to create subdir/go.mod: %v", err)
	}
	// No go.sum for subdir to test the case where go.sum is missing

	// Add files to git
	cmd = exec.Command("git", "add", ".")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to add files to git: %v", err)
	}

	// Configure git user for the test repo
	cmd = exec.Command("git", "config", "user.email", "test@example.com")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to set git user email: %v", err)
	}
	cmd = exec.Command("git", "config", "user.name", "Test User")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to set git user name: %v", err)
	}

	// Commit the files
	cmd = exec.Command("git", "commit", "-m", "test commit")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to commit files: %v", err)
	}

	// Collect go modules
	ctx := context.Background()
	modules, err := collectGoModules(ctx, tempDir)
	if err != nil {
		t.Fatalf("collectGoModules failed: %v", err)
	}

	// Verify results
	if len(modules) != 2 {
		t.Fatalf("Expected 2 modules, got %d", len(modules))
	}

	// Check root module
	root := modules[0]
	if root.modPath != "go.mod" {
		t.Errorf("Expected root modPath to be 'go.mod', got %s", root.modPath)
	}
	if root.modSHA == "" {
		t.Errorf("Expected root modSHA to be non-empty")
	}
	if root.sumSHA == "" {
		t.Errorf("Expected root sumSHA to be non-empty")
	}

	// Check subdir module
	sub := modules[1]
	if sub.modPath != "subdir/go.mod" {
		t.Errorf("Expected subdir modPath to be 'subdir/go.mod', got %s", sub.modPath)
	}
	if sub.modSHA == "" {
		t.Errorf("Expected subdir modSHA to be non-empty")
	}
	if sub.sumSHA != "" {
		t.Errorf("Expected subdir sumSHA to be empty, got %s", sub.sumSHA)
	}
}

func TestCollectGoModulesNoModFiles(t *testing.T) {
	// Create a temporary directory with no go.mod files
	tempDir := t.TempDir()

	// Initialize a git repository
	cmd := exec.Command("git", "init", ".")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to init git repo: %v", err)
	}

	// Create a non-go.mod file
	if err := os.WriteFile(filepath.Join(tempDir, "README.md"), []byte("# Test"), 0o644); err != nil {
		t.Fatalf("Failed to create README.md: %v", err)
	}

	// Add files to git
	cmd = exec.Command("git", "add", ".")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to add files to git: %v", err)
	}

	// Configure git user for the test repo
	cmd = exec.Command("git", "config", "user.email", "test@example.com")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to set git user email: %v", err)
	}
	cmd = exec.Command("git", "config", "user.name", "Test User")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to set git user name: %v", err)
	}

	// Commit the files
	cmd = exec.Command("git", "commit", "-m", "test commit")
	cmd.Dir = tempDir
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to commit files: %v", err)
	}

	// Collect go modules
	ctx := context.Background()
	modules, err := collectGoModules(ctx, tempDir)
	if err != nil {
		t.Fatalf("collectGoModules failed: %v", err)
	}

	// Verify no modules found
	if len(modules) != 0 {
		t.Fatalf("Expected 0 modules, got %d", len(modules))
	}
}
