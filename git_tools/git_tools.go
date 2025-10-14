// Package git_tools provides utilities for interacting with Git repositories.
package git_tools

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// DiffFile represents a file in a Git diff
type DiffFile struct {
	Path      string `json:"path"`
	OldPath   string `json:"old_path"` // Original path for renames and copies
	OldMode   string `json:"old_mode"`
	NewMode   string `json:"new_mode"`
	OldHash   string `json:"old_hash"`
	NewHash   string `json:"new_hash"`
	Status    string `json:"status"`    // A=added, M=modified, D=deleted, R=renamed, C=copied
	Additions int    `json:"additions"` // Number of lines added
	Deletions int    `json:"deletions"` // Number of lines deleted
}

// GitRawDiff returns a structured representation of the Git diff between two commits or references
// If 'to' is empty, it will show unstaged changes (diff with working directory)
func GitRawDiff(repoDir, from, to string) ([]DiffFile, error) {
	// Git command to generate the diff in raw format with full hashes and rename/copy detection
	// --find-copies-harder enables more aggressive copy detection
	var rawCmd, numstatCmd *exec.Cmd
	if to == "" {
		// If 'to' is empty, show unstaged changes
		rawCmd = exec.Command("git", "-C", repoDir, "diff", "--raw", "--abbrev=40", "-M", "-C", "--find-copies-harder", from)
		numstatCmd = exec.Command("git", "-C", repoDir, "diff", "--numstat", from)
	} else {
		// Normal diff between two refs
		rawCmd = exec.Command("git", "-C", repoDir, "diff", "--raw", "--abbrev=40", "-M", "-C", "--find-copies-harder", from, to)
		numstatCmd = exec.Command("git", "-C", repoDir, "diff", "--numstat", from, to)
	}

	// Execute raw diff command
	rawOut, err := rawCmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("error executing git diff --raw: %w - %s", err, string(rawOut))
	}

	// Execute numstat command
	numstatOut, err := numstatCmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("error executing git diff --numstat: %w - %s", err, string(numstatOut))
	}

	// Parse the raw diff output into structured format
	return parseRawDiffWithNumstat(string(rawOut), string(numstatOut))
}

// GitShow returns the result of git show for a specific commit hash
func GitShow(repoDir, hash string) (string, error) {
	cmd := exec.Command("git", "-C", repoDir, "show", hash)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("error executing git show: %w - %s", err, string(out))
	}
	return string(out), nil
}

// parseRawDiffWithNumstat converts git diff --raw and --numstat output into structured format
func parseRawDiffWithNumstat(rawOutput, numstatOutput string) ([]DiffFile, error) {
	// First parse the raw diff to get the base file information
	files, err := parseRawDiff(rawOutput)
	if err != nil {
		return nil, err
	}

	// Create a map to store numstat data by file path
	numstatMap := make(map[string]struct{ additions, deletions int })

	// Parse numstat output
	if numstatOutput != "" {
		scanner := bufio.NewScanner(strings.NewReader(strings.TrimSpace(numstatOutput)))
		for scanner.Scan() {
			line := scanner.Text()
			// Format: additions\tdeletions\tfilename
			// Example: 5\t3\tpath/to/file.go
			parts := strings.Split(line, "\t")
			if len(parts) >= 3 {
				additions := 0
				deletions := 0

				// Handle binary files (marked with "-")
				if parts[0] != "-" {
					if add, err := fmt.Sscanf(parts[0], "%d", &additions); err != nil || add != 1 {
						additions = 0
					}
				}
				if parts[1] != "-" {
					if del, err := fmt.Sscanf(parts[1], "%d", &deletions); err != nil || del != 1 {
						deletions = 0
					}
				}

				filePath := strings.Join(parts[2:], "\t") // Handle filenames with tabs
				numstatMap[filePath] = struct{ additions, deletions int }{additions, deletions}
			}
		}
	}

	// Merge numstat data into files
	for i := range files {
		if stats, found := numstatMap[files[i].Path]; found {
			files[i].Additions = stats.additions
			files[i].Deletions = stats.deletions
		}
	}

	return files, nil
}

// parseRawDiff converts git diff --raw output into structured format
// Handles both regular changes and rename/copy operations
func parseRawDiff(diffOutput string) ([]DiffFile, error) {
	var files []DiffFile
	if diffOutput == "" {
		return files, nil
	}

	// Process diff output line by line
	scanner := bufio.NewScanner(strings.NewReader(strings.TrimSpace(diffOutput)))
	for scanner.Scan() {
		line := scanner.Text()
		// Format: :oldmode newmode oldhash newhash status\tpath
		// Example: :000000 100644 0000000000000000000000000000000000000000 6b33680ae6de90edd5f627c84147f7a41aa9d9cf A        git_tools/git_tools.go
		// For renames: :100644 100644 oldHash newHash R100\told_path\tnew_path
		if !strings.HasPrefix(line, ":") {
			continue
		}

		parts := strings.Fields(line[1:]) // Skip the leading colon
		if len(parts) < 5 {
			continue // Not enough parts, skip this line
		}

		oldMode := parts[0]
		newMode := parts[1]
		oldHash := parts[2]
		newHash := parts[3]
		status := parts[4]

		// Find the tab after the status field
		tabIndex := strings.Index(line, "\t")
		if tabIndex == -1 {
			continue // No tab found, malformed line
		}

		// Extract paths after the tab
		pathPart := line[tabIndex+1:]

		// Handle rename/copy operations (status starts with R or C)
		if strings.HasPrefix(status, "R") || strings.HasPrefix(status, "C") {
			// For renames/copies, the path part contains: old_path\tnew_path
			pathParts := strings.Split(pathPart, "\t")
			if len(pathParts) == 2 {
				// Preserve rename/copy as a single entry with both paths
				oldPath := pathParts[0]
				newPath := pathParts[1]

				files = append(files, DiffFile{
					Path:    newPath, // New path as primary path
					OldPath: oldPath, // Original path for rename/copy
					OldMode: oldMode,
					NewMode: newMode,
					OldHash: oldHash,
					NewHash: newHash,
					Status:  status, // Preserve original R* or C* status
				})
			} else {
				// Malformed rename, treat as regular change
				files = append(files, DiffFile{
					Path:    pathPart,
					OldPath: "",
					OldMode: oldMode,
					NewMode: newMode,
					OldHash: oldHash,
					NewHash: newHash,
					Status:  status,
				})
			}
		} else {
			// Regular change (A, M, D)
			files = append(files, DiffFile{
				Path:    pathPart,
				OldPath: "", // No old path for regular changes
				OldMode: oldMode,
				NewMode: newMode,
				OldHash: oldHash,
				NewHash: newHash,
				Status:  status,
			})
		}
	}

	return files, nil
}

// GitLogEntry represents a single entry in the git log
type GitLogEntry struct {
	Hash    string   `json:"hash"`    // The full commit hash
	Refs    []string `json:"refs"`    // References (branches, tags) pointing to this commit
	Subject string   `json:"subject"` // The commit subject/message
}

// GitRecentLog returns the recent commit log between the initial commit and HEAD
func GitRecentLog(repoDir string, initialCommitHash string) ([]GitLogEntry, error) {
	// Validate input
	if initialCommitHash == "" {
		return nil, fmt.Errorf("initial commit hash must be provided")
	}

	// Find merge-base of HEAD and initial commit
	cmdMergeBase := exec.Command("git", "-C", repoDir, "merge-base", "HEAD", initialCommitHash)
	mergeBase, err := cmdMergeBase.CombinedOutput()
	if err != nil {
		// If merge-base fails (which can happen in simple repos), use initialCommitHash
		return getGitLog(repoDir, initialCommitHash)
	}

	mergeBaseHash := strings.TrimSpace(string(mergeBase))
	if mergeBaseHash == "" {
		// If merge-base doesn't return a valid hash, use initialCommitHash
		return getGitLog(repoDir, initialCommitHash)
	}

	// Use the merge-base as the 'from' point
	return getGitLog(repoDir, mergeBaseHash)
}

// getGitLog gets the git log with the specified format using the provided fromCommit
func getGitLog(repoDir string, fromCommit string) ([]GitLogEntry, error) {
	// Try to find the best commit range, starting from 10 commits back and working down to 0
	var fromRange string
	for i := 10; i >= 0; i-- {
		if i == 0 {
			// Use just fromCommit..HEAD as the range (no offset)
			fromRange = fromCommit + "..HEAD"
			break
		}

		// Check if fromCommit~i exists
		checkCmd := exec.Command("git", "-C", repoDir, "rev-parse", "--verify", fromCommit+fmt.Sprintf("~%d", i))
		if err := checkCmd.Run(); err == nil {
			// This offset works, use it
			fromRange = fromCommit + fmt.Sprintf("~%d..HEAD", i)
			break
		}
	}

	// Use the determined range with the specified format for easy parsing
	cmd := exec.Command("git", "-C", repoDir, "log", "--boundary", "-n", "1000", "--oneline", "--decorate", "--pretty=%H%x00%s%x00%d", fromRange)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("error executing git log: %w - %s", err, string(out))
	}

	return parseGitLog(string(out))
}

// parseGitLog parses the output of git log with null-separated fields
func parseGitLog(logOutput string) ([]GitLogEntry, error) {
	var entries []GitLogEntry
	if logOutput == "" {
		return entries, nil
	}

	scanner := bufio.NewScanner(strings.NewReader(strings.TrimSpace(logOutput)))
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Split(line, "\x00")
		if len(parts) != 3 {
			continue // Skip malformed lines
		}

		hash := parts[0]
		subject := parts[1]
		decoration := parts[2]

		// Parse the refs from the decoration
		refs := parseRefs(decoration)

		entries = append(entries, GitLogEntry{
			Hash:    hash,
			Refs:    refs,
			Subject: subject,
		})
	}

	return entries, nil
}

// parseRefs extracts references from git decoration format
func parseRefs(decoration string) []string {
	// The decoration format from %d is: (HEAD -> main, origin/main, tag: v1.0.0)
	if decoration == "" {
		return nil
	}

	// Remove surrounding parentheses and whitespace
	decoration = strings.TrimSpace(decoration)
	decoration = strings.TrimPrefix(decoration, " (")
	decoration = strings.TrimPrefix(decoration, "(")
	decoration = strings.TrimSuffix(decoration, ")")
	decoration = strings.TrimSuffix(decoration, ") ")

	if decoration == "" {
		return nil
	}

	// Split by comma
	parts := strings.Split(decoration, ", ")

	// Process each part
	var refs []string
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		// Handle HEAD -> branch format
		if strings.HasPrefix(part, "HEAD -> ") {
			refs = append(refs, strings.TrimPrefix(part, "HEAD -> "))
			continue
		}

		// Handle tag: format
		if strings.HasPrefix(part, "tag: ") {
			refs = append(refs, strings.TrimPrefix(part, "tag: "))
			continue
		}

		// Handle just HEAD (no branch)
		if part == "HEAD" {
			refs = append(refs, part)
			continue
		}

		// Regular branch name
		refs = append(refs, part)
	}

	return refs
}

// validateRepoPath verifies that a file is tracked by git and within the repository boundaries
// Returns the full path to the file if valid
func validateRepoPath(repoDir, filePath string) (string, error) {
	// First verify that the requested file is tracked by git to prevent
	// access to files outside the repository
	cmd := exec.Command("git", "-C", repoDir, "ls-files", "--error-unmatch", filePath)
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("file not tracked by git or outside repository: %s", filePath)
	}

	// Construct the full file path
	fullPath := filepath.Join(repoDir, filePath)

	// Validate that the resolved path is still within the repository directory
	// to prevent directory traversal attacks (e.g., ../../../etc/passwd)
	absRepoDir, err := filepath.Abs(repoDir)
	if err != nil {
		return "", fmt.Errorf("unable to resolve absolute repository path: %w", err)
	}

	absFilePath, err := filepath.Abs(fullPath)
	if err != nil {
		return "", fmt.Errorf("unable to resolve absolute file path: %w", err)
	}

	// Check that the absolute file path starts with the absolute repository path
	if !strings.HasPrefix(absFilePath, absRepoDir+string(filepath.Separator)) {
		return "", fmt.Errorf("file path outside repository: %s", filePath)
	}

	return fullPath, nil
}

// GitCat returns the contents of a file in the repository at the given path
// This is used to get the current working copy of a file (not using git show)
func GitCat(repoDir, filePath string) (string, error) {
	fullPath, err := validateRepoPath(repoDir, filePath)
	if err != nil {
		return "", err
	}

	// Read the file
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("error reading file %s: %w", filePath, err)
	}

	return string(content), nil
}

// GitSaveFile saves content to a file in the repository, checking first that it's tracked by git
// This prevents writing to files outside the repository
func GitSaveFile(repoDir, filePath, content string) error {
	fullPath, err := validateRepoPath(repoDir, filePath)
	if err != nil {
		return err
	}

	// Write the content to the file
	err = os.WriteFile(fullPath, []byte(content), 0o644)
	if err != nil {
		return fmt.Errorf("error writing to file %s: %w", filePath, err)
	}

	return nil
}

// AutoCommitDiffViewChanges automatically commits changes to the specified file
// If the last commit message is exactly "User changes from diff view.", it amends the commit
// Otherwise, it creates a new commit
func AutoCommitDiffViewChanges(ctx context.Context, repoDir, filePath string) error {
	// Check if the last commit has the expected message
	cmd := exec.CommandContext(ctx, "git", "log", "-1", "--pretty=%s")
	cmd.Dir = repoDir
	output, err := cmd.Output()
	commitMsg := strings.TrimSpace(string(output))

	// Check if we should amend or create a new commit
	const expectedMsg = "User changes from diff view."
	amend := err == nil && commitMsg == expectedMsg

	// Commit the changes
	// Instead of calling git add first, we call git commit with a filepsec, which works the same,
	// but would fail if the file isn't tracked by git already.
	if amend {
		// Amend the previous commit
		cmd = exec.CommandContext(ctx, "git", "commit", "--amend", "--no-edit", "--", filePath)
	} else {
		// Create a new commit
		cmd = exec.CommandContext(ctx, "git", "commit", "-m", expectedMsg, "--", filePath)
	}
	cmd.Dir = repoDir

	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("error committing changes: %w - git output: %s", err, string(output))
	}

	return nil
}

// GitGetUntrackedFiles returns a list of untracked files in the repository
func GitGetUntrackedFiles(repoDir string) ([]string, error) {
	cmd := exec.Command("git", "-C", repoDir, "ls-files", "--others", "--exclude-standard", "-z")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("error executing git ls-files: %w - %s", err, string(output))
	}
	var result []string
	for path := range bytes.SplitSeq(output, []byte{0}) {
		path = bytes.TrimSpace(path)
		if len(path) == 0 {
			continue
		}
		result = append(result, string(path))
	}
	return result, nil
}
