package dockerimg

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestSetupHooksDir(t *testing.T) {
	// Create a temporary git repository
	tmpDir, err := os.MkdirTemp("", "test-git-repo-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Test setupHooksDir function
	hooksDir, err := setupHooksDir(tmpDir)
	if err != nil {
		t.Fatalf("setupHooksDir failed: %v", err)
	}
	defer os.RemoveAll(hooksDir)

	// Verify hooks directory was created
	if _, err := os.Stat(hooksDir); os.IsNotExist(err) {
		t.Errorf("hooks directory was not created: %s", hooksDir)
	}

	// Verify pre-receive hook was created
	preReceiveHook := filepath.Join(hooksDir, "pre-receive")
	if _, err := os.Stat(preReceiveHook); os.IsNotExist(err) {
		t.Errorf("pre-receive hook was not created: %s", preReceiveHook)
	}

	// Verify pre-receive hook is executable
	info, err := os.Stat(preReceiveHook)
	if err != nil {
		t.Errorf("failed to stat pre-receive hook: %v", err)
	}
	if info.Mode()&0o111 == 0 {
		t.Errorf("pre-receive hook is not executable")
	}

	// Verify pre-receive hook contains expected content
	content, err := os.ReadFile(preReceiveHook)
	if err != nil {
		t.Errorf("failed to read pre-receive hook: %v", err)
	}

	// Check for key elements in the script
	contentStr := string(content)
	if !containsAll(contentStr, []string{
		"#!/usr/bin/env bash",
		"refs/remotes/origin/",
		"git push origin",
		"Force pushes are not allowed",
		"git merge-base --is-ancestor",
	}) {
		t.Errorf("pre-receive hook missing expected content")
	}
}

// Helper function to check if a string contains all substrings
func containsAll(str string, substrings []string) bool {
	for _, substr := range substrings {
		if !contains(str, substr) {
			return false
		}
	}
	return true
}

// Helper function to check if a string contains a substring
func contains(str, substr string) bool {
	return len(str) >= len(substr) && findIndex(str, substr) >= 0
}

// Helper function to find index of substring (simple implementation)
func findIndex(str, substr string) int {
	for i := 0; i <= len(str)-len(substr); i++ {
		if str[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

func TestPreReceiveHookScript(t *testing.T) {
	// Create a temporary git repository
	tmpDir, err := os.MkdirTemp("", "test-git-repo-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Set up hooks directory
	hooksDir, err := setupHooksDir(tmpDir)
	if err != nil {
		t.Fatalf("setupHooksDir failed: %v", err)
	}
	defer os.RemoveAll(hooksDir)

	// Read the pre-receive hook script
	preReceiveHook := filepath.Join(hooksDir, "pre-receive")
	script, err := os.ReadFile(preReceiveHook)
	if err != nil {
		t.Fatalf("failed to read pre-receive hook: %v", err)
	}

	// Verify the script contains the expected bash shebang
	scriptContent := string(script)
	if !contains(scriptContent, "#!/usr/bin/env bash") {
		t.Errorf("pre-receive hook missing bash shebang")
	}

	// Verify the script contains logic to handle refs/remotes/origin/Y
	if !contains(scriptContent, "refs/remotes/origin/(.+)") {
		t.Errorf("pre-receive hook missing refs/remotes/origin pattern matching")
	}

	// Verify the script contains force-push protection
	if !contains(scriptContent, "git merge-base --is-ancestor") {
		t.Errorf("pre-receive hook missing force-push protection")
	}

	// Verify the script contains git push origin command
	if !contains(scriptContent, "git push origin") {
		t.Errorf("pre-receive hook missing git push origin command")
	}

	// Verify the script exits with proper error codes
	if !contains(scriptContent, "exit 1") {
		t.Errorf("pre-receive hook missing error exit code")
	}

	if !contains(scriptContent, "exit 0") {
		t.Errorf("pre-receive hook missing success exit code")
	}
}

func TestGitHTTPHooksConfiguration(t *testing.T) {
	// Create a temporary git repository
	tmpDir, err := os.MkdirTemp("", "test-git-repo-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Initialize git repository
	if err := runGitCommand(tmpDir, "init"); err != nil {
		t.Fatalf("failed to init git repo: %v", err)
	}

	// Set up hooks directory
	hooksDir, err := setupHooksDir(tmpDir)
	if err != nil {
		t.Fatalf("setupHooksDir failed: %v", err)
	}
	defer os.RemoveAll(hooksDir)

	// Create gitHTTP instance
	gitHTTP := &gitHTTP{
		gitRepoRoot: tmpDir,
		hooksDir:    hooksDir,
		pass:        []byte("test-pass"),
		browserC:    make(chan bool, 1),
	}

	// Test that the gitHTTP struct has the hooks directory set
	if gitHTTP.hooksDir == "" {
		t.Errorf("gitHTTP hooksDir is empty")
	}

	if gitHTTP.hooksDir != hooksDir {
		t.Errorf("gitHTTP hooksDir mismatch: expected %s, got %s", hooksDir, gitHTTP.hooksDir)
	}

	// Verify that the hooks directory exists and contains the pre-receive hook
	preReceiveHook := filepath.Join(hooksDir, "pre-receive")
	if _, err := os.Stat(preReceiveHook); os.IsNotExist(err) {
		t.Errorf("pre-receive hook missing: %s", preReceiveHook)
	}
}

// Helper function to run git commands
func runGitCommand(dir string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	return cmd.Run()
}

func TestPreReceiveHookExecution(t *testing.T) {
	// Create a temporary git repository
	tmpDir, err := os.MkdirTemp("", "test-git-repo-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Initialize git repository
	if err := runGitCommand(tmpDir, "init"); err != nil {
		t.Fatalf("failed to init git repo: %v", err)
	}

	// Set up hooks directory
	hooksDir, err := setupHooksDir(tmpDir)
	if err != nil {
		t.Fatalf("setupHooksDir failed: %v", err)
	}
	defer os.RemoveAll(hooksDir)

	// Test the hook script syntax by running bash -n on it
	preReceiveHook := filepath.Join(hooksDir, "pre-receive")
	cmd := exec.Command("bash", "-n", preReceiveHook)
	if err := cmd.Run(); err != nil {
		t.Errorf("pre-receive hook has syntax errors: %v", err)
	}

	// Test that the hook script is executable
	info, err := os.Stat(preReceiveHook)
	if err != nil {
		t.Fatalf("failed to stat pre-receive hook: %v", err)
	}

	mode := info.Mode()
	if mode&0o111 == 0 {
		t.Errorf("pre-receive hook is not executable: mode = %v", mode)
	}
}
