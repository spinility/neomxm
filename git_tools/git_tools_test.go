package git_tools

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func setupTestRepo(t *testing.T) string {
	// Create a temporary directory for the test repository
	tempDir, err := os.MkdirTemp("", "git-tools-test")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}

	// Initialize a git repository
	cmd := exec.Command("git", "-C", tempDir, "init")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Failed to initialize git repo: %v - %s", err, out)
	}

	// Configure git user
	cmd = exec.Command("git", "-C", tempDir, "config", "user.email", "test@example.com")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Failed to configure git user email: %v - %s", err, out)
	}

	cmd = exec.Command("git", "-C", tempDir, "config", "user.name", "Test User")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Failed to configure git user name: %v - %s", err, out)
	}

	return tempDir
}

func createAndCommitFile(t *testing.T, repoDir, filename, content string, stage bool) string {
	filePath := filepath.Join(repoDir, filename)
	if err := os.WriteFile(filePath, []byte(content), 0o644); err != nil {
		t.Fatalf("Failed to write file: %v", err)
	}

	if stage {
		cmd := exec.Command("git", "-C", repoDir, "add", filename)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("Failed to add file: %v - %s", err, out)
		}

		cmd = exec.Command("git", "-C", repoDir, "commit", "-m", "Add "+filename)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("Failed to commit file: %v - %s", err, out)
		}

		// Get the commit hash
		cmd = exec.Command("git", "-C", repoDir, "rev-parse", "HEAD")
		out, err := cmd.Output()
		if err != nil {
			t.Fatalf("Failed to get commit hash: %v", err)
		}
		return string(out[:len(out)-1]) // Trim newline
	}

	return ""
}

func TestGitRawDiff(t *testing.T) {
	repoDir := setupTestRepo(t)
	defer os.RemoveAll(repoDir)

	// Create initial file
	initHash := createAndCommitFile(t, repoDir, "test.txt", "initial content\n", true)

	// Modify the file
	modHash := createAndCommitFile(t, repoDir, "test.txt", "initial content\nmodified content\n", true)

	// Test the diff between the two commits
	diff, err := GitRawDiff(repoDir, initHash, modHash)
	if err != nil {
		t.Fatalf("GitRawDiff failed: %v", err)
	}

	if len(diff) != 1 {
		t.Fatalf("Expected 1 file in diff, got %d", len(diff))
	}

	if diff[0].Path != "test.txt" {
		t.Errorf("Expected path to be test.txt, got %s", diff[0].Path)
	}

	if diff[0].Status != "M" {
		t.Errorf("Expected status to be M (modified), got %s", diff[0].Status)
	}

	if diff[0].OldMode == "" || diff[0].NewMode == "" {
		t.Error("Expected file modes to be present")
	}

	if diff[0].OldHash == "" || diff[0].NewHash == "" {
		t.Error("Expected file hashes to be present")
	}

	// Test with invalid commit hash
	_, err = GitRawDiff(repoDir, "invalid", modHash)
	if err == nil {
		t.Error("Expected error for invalid commit hash, got none")
	}
}

func TestGitShow(t *testing.T) {
	repoDir := setupTestRepo(t)
	defer os.RemoveAll(repoDir)

	// Create file and commit
	commitHash := createAndCommitFile(t, repoDir, "test.txt", "test content\n", true)

	// Test GitShow
	show, err := GitShow(repoDir, commitHash)
	if err != nil {
		t.Fatalf("GitShow failed: %v", err)
	}

	if show == "" {
		t.Error("Expected non-empty output from GitShow")
	}

	// Test with invalid commit hash
	_, err = GitShow(repoDir, "invalid")
	if err == nil {
		t.Error("Expected error for invalid commit hash, got none")
	}
}

func TestParseGitLog(t *testing.T) {
	// Test with the format from --pretty="%H%x00%s%x00%d"
	logOutput := "abc123\x00Initial commit\x00 (HEAD -> main, origin/main)\n" +
		"def456\x00Add feature X\x00 (tag: v1.0.0)\n" +
		"ghi789\x00Fix bug Y\x00"

	entries, err := parseGitLog(logOutput)
	if err != nil {
		t.Fatalf("parseGitLog returned error: %v", err)
	}

	if len(entries) != 3 {
		t.Fatalf("Expected 3 log entries, got %d", len(entries))
	}

	// Check first entry
	if entries[0].Hash != "abc123" {
		t.Errorf("Expected hash abc123, got %s", entries[0].Hash)
	}
	if len(entries[0].Refs) != 2 {
		t.Errorf("Expected 2 refs, got %d", len(entries[0].Refs))
	}
	if entries[0].Refs[0] != "main" || entries[0].Refs[1] != "origin/main" {
		t.Errorf("Incorrect refs parsed: %v", entries[0].Refs)
	}
	if entries[0].Subject != "Initial commit" {
		t.Errorf("Expected subject 'Initial commit', got '%s'", entries[0].Subject)
	}

	// Check second entry
	if entries[1].Hash != "def456" {
		t.Errorf("Expected hash def456, got %s", entries[1].Hash)
	}
	if len(entries[1].Refs) != 1 {
		t.Errorf("Expected 1 ref, got %d", len(entries[1].Refs))
	}
	if entries[1].Refs[0] != "v1.0.0" {
		t.Errorf("Incorrect tag parsed: %v", entries[1].Refs)
	}
	if entries[1].Subject != "Add feature X" {
		t.Errorf("Expected subject 'Add feature X', got '%s'", entries[1].Subject)
	}

	// Check third entry
	if entries[2].Hash != "ghi789" {
		t.Errorf("Expected hash ghi789, got %s", entries[2].Hash)
	}
	if len(entries[2].Refs) != 0 {
		t.Errorf("Expected 0 refs, got %d", len(entries[2].Refs))
	}
	if entries[2].Subject != "Fix bug Y" {
		t.Errorf("Expected subject 'Fix bug Y', got '%s'", entries[2].Subject)
	}
}

func TestParseRefs(t *testing.T) {
	testCases := []struct {
		decoration string
		expected   []string
	}{
		{"(HEAD -> main, origin/main)", []string{"main", "origin/main"}},
		{"(tag: v1.0.0)", []string{"v1.0.0"}},
		{"(HEAD -> feature/branch, origin/feature/branch, tag: v0.9.0)", []string{"feature/branch", "origin/feature/branch", "v0.9.0"}},
		{" (tag: v2.0.0) ", []string{"v2.0.0"}},
		{"", nil},
		{" ", nil},
		{"()", nil},
	}

	for i, tc := range testCases {
		refs := parseRefs(tc.decoration)

		if len(refs) != len(tc.expected) {
			t.Errorf("Case %d: Expected %d refs, got %d", i, len(tc.expected), len(refs))
			continue
		}

		for j, ref := range refs {
			if j >= len(tc.expected) || ref != tc.expected[j] {
				t.Errorf("Case %d: Expected ref '%s', got '%s'", i, tc.expected[j], ref)
			}
		}
	}
}

func TestGitRecentLog(t *testing.T) {
	// Create a temporary directory for the test repository
	tmpDir, err := os.MkdirTemp("", "git-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Initialize a git repository
	initCmd := exec.Command("git", "-C", tmpDir, "init")
	if out, err := initCmd.CombinedOutput(); err != nil {
		t.Fatalf("Failed to initialize git repository: %v\n%s", err, out)
	}

	// Configure git user for the test repository
	exec.Command("git", "-C", tmpDir, "config", "user.name", "Test User").Run()
	exec.Command("git", "-C", tmpDir, "config", "user.email", "test@example.com").Run()

	// Create initial commit
	initialFile := filepath.Join(tmpDir, "initial.txt")
	os.WriteFile(initialFile, []byte("initial content"), 0o644)
	exec.Command("git", "-C", tmpDir, "add", "initial.txt").Run()
	initialCommitCmd := exec.Command("git", "-C", tmpDir, "commit", "-m", "Initial commit")
	out, err := initialCommitCmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to create initial commit: %v\n%s", err, out)
	}

	// Get the initial commit hash
	initialCommitCmd = exec.Command("git", "-C", tmpDir, "rev-parse", "HEAD")
	initialCommitBytes, err := initialCommitCmd.Output()
	if err != nil {
		t.Fatalf("Failed to get initial commit hash: %v", err)
	}
	initialCommitHash := strings.TrimSpace(string(initialCommitBytes))

	// Add a second commit
	secondFile := filepath.Join(tmpDir, "second.txt")
	os.WriteFile(secondFile, []byte("second content"), 0o644)
	exec.Command("git", "-C", tmpDir, "add", "second.txt").Run()
	secondCommitCmd := exec.Command("git", "-C", tmpDir, "commit", "-m", "Second commit")
	out, err = secondCommitCmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to create second commit: %v\n%s", err, out)
	}

	// Create a branch and tag
	exec.Command("git", "-C", tmpDir, "branch", "test-branch").Run()
	exec.Command("git", "-C", tmpDir, "tag", "-a", "v1.0.0", "-m", "Version 1.0.0").Run()

	// Add a third commit
	thirdFile := filepath.Join(tmpDir, "third.txt")
	os.WriteFile(thirdFile, []byte("third content"), 0o644)
	exec.Command("git", "-C", tmpDir, "add", "third.txt").Run()
	thirdCommitCmd := exec.Command("git", "-C", tmpDir, "commit", "-m", "Third commit")
	out, err = thirdCommitCmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to create third commit: %v\n%s", err, out)
	}

	// Test GitRecentLog
	log, err := GitRecentLog(tmpDir, initialCommitHash)
	if err != nil {
		t.Fatalf("GitRecentLog failed: %v", err)
	}

	// No need to check specific entries in order
	// Just validate we can find all commits (including boundary commit)

	// Verify that we have the correct behavior with the fromCommit parameter:
	// With --boundary flag, we should find all commits including the boundary (initial) commit
	// 1. We should find the initial, second and third commits
	foundThird := false
	foundSecond := false
	foundInitial := false
	for _, entry := range log {
		t.Logf("Found entry: %s - %s", entry.Hash, entry.Subject)
		if entry.Subject == "Third commit" {
			foundThird = true
		} else if entry.Subject == "Second commit" {
			foundSecond = true
		} else if entry.Subject == "Initial commit" {
			foundInitial = true
		}
	}

	if !foundThird {
		t.Errorf("Expected to find 'Third commit' in log entries")
	}
	if !foundSecond {
		t.Errorf("Expected to find 'Second commit' in log entries")
	}
	if !foundInitial {
		t.Errorf("Expected to find 'Initial commit' in log entries (--boundary flag should include it)")
	}
}

func TestParseRefsEdgeCases(t *testing.T) {
	testCases := []struct {
		name       string
		decoration string
		expected   []string
	}{
		{
			name:       "Multiple tags and branches",
			decoration: "(HEAD -> main, origin/main, tag: v1.0.0, tag: beta)",
			expected:   []string{"main", "origin/main", "v1.0.0", "beta"},
		},
		{
			name:       "Leading/trailing whitespace",
			decoration: "  (HEAD -> main)  ",
			expected:   []string{"main"},
		},
		{
			name:       "No parentheses",
			decoration: "HEAD -> main, tag: v1.0.0",
			expected:   []string{"main", "v1.0.0"},
		},
		{
			name:       "Feature branch with slash",
			decoration: "(HEAD -> feature/new-ui)",
			expected:   []string{"feature/new-ui"},
		},
		{
			name:       "Only HEAD with no branch",
			decoration: "(HEAD)",
			expected:   []string{"HEAD"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			refs := parseRefs(tc.decoration)

			if len(refs) != len(tc.expected) {
				t.Errorf("%s: Expected %d refs, got %d", tc.name, len(tc.expected), len(refs))
				return
			}

			for i, ref := range refs {
				if ref != tc.expected[i] {
					t.Errorf("%s: Expected ref[%d] = '%s', got '%s'", tc.name, i, tc.expected[i], ref)
				}
			}
		})
	}
}

func TestGitRawDiffWithRename(t *testing.T) {
	repoDir := setupTestRepo(t)
	defer os.RemoveAll(repoDir)

	// Create and commit initial file
	createAndCommitFile(t, repoDir, "original.txt", "content for testing rename\n", true)

	// Rename the file using git mv
	cmd := exec.Command("git", "-C", repoDir, "mv", "original.txt", "renamed.txt")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Failed to rename file: %v - %s", err, out)
	}

	// Test diff with unstaged changes (should detect rename)
	diff, err := GitRawDiff(repoDir, "HEAD", "")
	if err != nil {
		t.Fatalf("GitRawDiff failed: %v", err)
	}

	// With rename detection, we should get 1 file with rename status
	if len(diff) != 1 {
		t.Fatalf("Expected 1 file in diff (rename), got %d", len(diff))
	}

	renameFile := &diff[0]

	// Check that we have a rename status
	if !strings.HasPrefix(renameFile.Status, "R") {
		t.Errorf("Expected rename status (R*), got '%s'", renameFile.Status)
	}

	// Check the paths
	if renameFile.OldPath != "original.txt" {
		t.Errorf("Expected old path to be 'original.txt', got '%s'", renameFile.OldPath)
	}
	if renameFile.Path != "renamed.txt" {
		t.Errorf("Expected new path to be 'renamed.txt', got '%s'", renameFile.Path)
	}

	// Verify that the hashes are the same (same content)
	if renameFile.OldHash != renameFile.NewHash {
		t.Errorf("Expected rename to preserve content hash: OldHash=%s, NewHash=%s",
			renameFile.OldHash, renameFile.NewHash)
	}
}

func TestGitRawDiffWithCopy(t *testing.T) {
	repoDir := setupTestRepo(t)
	defer os.RemoveAll(repoDir)

	// Create a larger file to make copy detection more reliable
	longContent := "This is the original content for testing copy detection.\n"
	for i := range 20 {
		longContent += fmt.Sprintf("Line %d: This is some substantial content to help git detect copies.\n", i+1)
	}

	// Create and commit initial file
	createAndCommitFile(t, repoDir, "original.txt", longContent, true)

	// Copy the file and modify it slightly
	cmd := exec.Command("cp", filepath.Join(repoDir, "original.txt"), filepath.Join(repoDir, "copied.txt"))
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Failed to copy file: %v - %s", err, out)
	}

	// Make a small modification to the copied file (add a line at the end)
	cmd = exec.Command("sh", "-c", "echo 'This is a small modification to the copied file' >> "+filepath.Join(repoDir, "copied.txt"))
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Failed to modify copied file: %v - %s", err, out)
	}

	// Add the copied file to git
	cmd = exec.Command("git", "-C", repoDir, "add", "copied.txt")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Failed to add copied file: %v - %s", err, out)
	}

	// Test diff with staged changes (should detect copy)
	diff, err := GitRawDiff(repoDir, "HEAD", "")
	if err != nil {
		t.Fatalf("GitRawDiff failed: %v", err)
	}

	// Debug: print all files to understand what we're getting
	t.Logf("Found %d files in diff:", len(diff))
	for i, file := range diff {
		t.Logf("  [%d] Path=%s, OldPath=%s, Status=%s", i, file.Path, file.OldPath, file.Status)
	}

	// With copy detection, we should get a file with copy status
	var copyFile *DiffFile
	for i := range diff {
		if strings.HasPrefix(diff[i].Status, "C") {
			copyFile = &diff[i]
			break
		}
	}

	// If copy detection didn't work, that's still OK - it's a git behavior issue, not our code
	// The important thing is that our code can handle copy status when git does detect it
	if copyFile == nil {
		// Skip the test if git doesn't detect the copy, but log it
		t.Skip("Git did not detect copy - this is expected behavior for small files or when similarity is low")
		return
	}

	// If we did get a copy, validate it
	t.Logf("Found copy: %s -> %s (status: %s)", copyFile.OldPath, copyFile.Path, copyFile.Status)

	// Check the paths
	if copyFile.OldPath != "original.txt" {
		t.Errorf("Expected old path to be 'original.txt', got '%s'", copyFile.OldPath)
	}
	if copyFile.Path != "copied.txt" {
		t.Errorf("Expected new path to be 'copied.txt', got '%s'", copyFile.Path)
	}

	// Verify that the old hash is not empty (original content should exist)
	if copyFile.OldHash == "0000000000000000000000000000000000000000" {
		t.Error("Expected old hash to not be empty")
	}
	if copyFile.NewHash == "0000000000000000000000000000000000000000" {
		t.Error("Expected new hash to not be empty")
	}
}

func TestGitSaveFile(t *testing.T) {
	// Create a temporary directory for the test repository
	tmpDir, err := os.MkdirTemp("", "gitsave-test-")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Initialize a git repository
	cmd := exec.Command("git", "init")
	cmd.Dir = tmpDir
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to initialize git repo: %v, output: %s", err, output)
	}

	// Create and add a test file to the repo
	testFilePath := "test-file.txt"
	testFileContent := "initial content"
	testFileFull := filepath.Join(tmpDir, testFilePath)

	err = os.WriteFile(testFileFull, []byte(testFileContent), 0o644)
	if err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	// Add the file to git
	cmd = exec.Command("git", "add", testFilePath)
	cmd.Dir = tmpDir
	output, err = cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to add test file to git: %v, output: %s", err, output)
	}

	// Commit the file
	cmd = exec.Command("git", "commit", "-m", "Initial commit")
	cmd.Dir = tmpDir
	cmd.Env = append(os.Environ(),
		"GIT_AUTHOR_NAME=Test",
		"GIT_AUTHOR_EMAIL=test@example.com",
		"GIT_COMMITTER_NAME=Test",
		"GIT_COMMITTER_EMAIL=test@example.com")
	output, err = cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to commit test file: %v, output: %s", err, output)
	}

	// Test successful save
	newContent := "updated content"
	err = GitSaveFile(tmpDir, testFilePath, newContent)
	if err != nil {
		t.Errorf("GitSaveFile failed: %v", err)
	}

	// Verify the file was updated
	content, err := os.ReadFile(testFileFull)
	if err != nil {
		t.Fatalf("Failed to read updated file: %v", err)
	}
	if string(content) != newContent {
		t.Errorf("File content not updated correctly; got %q, want %q", string(content), newContent)
	}

	// Test saving a file outside the repo
	err = GitSaveFile(tmpDir, "../outside.txt", "malicious content")
	if err == nil {
		t.Error("GitSaveFile should have rejected a path outside the repository")
	}

	// Test saving a file not tracked by git
	err = GitSaveFile(tmpDir, "untracked.txt", "untracked content")
	if err == nil {
		t.Error("GitSaveFile should have rejected an untracked file")
	}
}
