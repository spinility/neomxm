package bashkit

import (
	"fmt"
	"strings"
	"sync"

	"mvdan.cc/sh/v3/syntax"
)

var checks = []func(*syntax.CallExpr) error{
	noGitConfigUsernameEmailChanges,
	noBlindGitAdd,
}

// Process-level checks that track state across calls
var processAwareChecks = []func(*syntax.CallExpr) error{
	noSketchWipBranchChangesOnce,
}

// Track whether sketch-wip branch warning has been shown in this process
var (
	sketchWipWarningMu    sync.Mutex
	sketchWipWarningShown bool
)

// ResetSketchWipWarning resets the warning state for testing purposes
func ResetSketchWipWarning() {
	sketchWipWarningMu.Lock()
	sketchWipWarningShown = false
	sketchWipWarningMu.Unlock()
}

// Check inspects bashScript and returns an error if it ought not be executed.
// Check DOES NOT PROVIDE SECURITY against malicious actors.
// It is intended to catch straightforward mistakes in which a model
// does things despite having been instructed not to do them.
func Check(bashScript string) error {
	r := strings.NewReader(bashScript)
	parser := syntax.NewParser()
	file, err := parser.Parse(r, "")
	if err != nil {
		// Execution will fail, but we'll get a better error message from bash.
		// Note that if this were security load bearing, this would be a terrible idea:
		// You could smuggle stuff past Check by exploiting differences in what is considered syntactically valid.
		// But it is not.
		return nil
	}

	syntax.Walk(file, func(node syntax.Node) bool {
		if err != nil {
			return false
		}
		callExpr, ok := node.(*syntax.CallExpr)
		if !ok {
			return true
		}
		// Run regular checks
		for _, check := range checks {
			err = check(callExpr)
			if err != nil {
				return false
			}
		}
		// Run process-aware checks
		for _, check := range processAwareChecks {
			err = check(callExpr)
			if err != nil {
				return false
			}
		}
		return true
	})

	return err
}

// noGitConfigUsernameEmailChanges checks for git config username/email changes.
// It uses simple heuristics, and has both false positives and false negatives.
func noGitConfigUsernameEmailChanges(cmd *syntax.CallExpr) error {
	if hasGitConfigUsernameEmailChanges(cmd) {
		return fmt.Errorf("permission denied: changing git config username/email is not allowed, use env vars instead")
	}
	return nil
}

func hasGitConfigUsernameEmailChanges(cmd *syntax.CallExpr) bool {
	if len(cmd.Args) < 3 {
		return false
	}
	if cmd.Args[0].Lit() != "git" {
		return false
	}

	configIndex := -1
	for i, arg := range cmd.Args {
		if arg.Lit() == "config" {
			configIndex = i
			break
		}
	}

	if configIndex < 0 || configIndex == len(cmd.Args)-1 {
		return false
	}

	// check for user.name or user.email
	keyIndex := -1
	for i, arg := range cmd.Args {
		if i < configIndex {
			continue
		}
		if arg.Lit() == "user.name" || arg.Lit() == "user.email" {
			keyIndex = i
			break
		}
	}

	if keyIndex < 0 || keyIndex == len(cmd.Args)-1 {
		return false
	}

	// user.name/user.email is followed by a value
	return true
}

// WillRunGitCommit checks if the provided bash script will run 'git commit'.
// It returns true if any command in the script is a git commit command.
func WillRunGitCommit(bashScript string) (bool, error) {
	r := strings.NewReader(bashScript)
	parser := syntax.NewParser()
	file, err := parser.Parse(r, "")
	if err != nil {
		// Parsing failed, but let's not consider this an error for the same reasons as in Check
		return false, nil
	}

	willCommit := false

	syntax.Walk(file, func(node syntax.Node) bool {
		callExpr, ok := node.(*syntax.CallExpr)
		if !ok {
			return true
		}
		if isGitCommitCommand(callExpr) {
			willCommit = true
			return false
		}
		return true
	})

	return willCommit, nil
}

// noBlindGitAdd checks for git add commands that blindly add all files.
// It rejects patterns like 'git add -A', 'git add .', 'git add --all', 'git add *'.
func noBlindGitAdd(cmd *syntax.CallExpr) error {
	if hasBlindGitAdd(cmd) {
		return fmt.Errorf("permission denied: blind git add commands (git add -A, git add ., git add --all, git add *) are not allowed, specify files explicitly")
	}
	return nil
}

func hasBlindGitAdd(cmd *syntax.CallExpr) bool {
	if len(cmd.Args) < 2 {
		return false
	}
	if cmd.Args[0].Lit() != "git" {
		return false
	}

	// Find the 'add' subcommand
	addIndex := -1
	for i, arg := range cmd.Args {
		if arg.Lit() == "add" {
			addIndex = i
			break
		}
	}

	if addIndex < 0 {
		return false
	}

	// Check arguments after 'add' for blind patterns
	for i := addIndex + 1; i < len(cmd.Args); i++ {
		arg := cmd.Args[i].Lit()
		// Check for blind add patterns
		if arg == "-A" || arg == "--all" || arg == "." || arg == "*" {
			return true
		}
	}

	return false
}

// isGitCommitCommand checks if a command is 'git commit'.
func isGitCommitCommand(cmd *syntax.CallExpr) bool {
	if len(cmd.Args) < 2 {
		return false
	}

	// First argument must be 'git'
	if cmd.Args[0].Lit() != "git" {
		return false
	}

	// Look for 'commit' in any position after 'git'
	for i := 1; i < len(cmd.Args); i++ {
		if cmd.Args[i].Lit() == "commit" {
			return true
		}
	}

	return false
}

// noSketchWipBranchChangesOnce checks for git commands that would change the sketch-wip branch.
// It rejects commands that would rename the sketch-wip branch or switch away from it.
// This check only shows the warning once per process.
func noSketchWipBranchChangesOnce(cmd *syntax.CallExpr) error {
	if hasSketchWipBranchChanges(cmd) {
		// Check if we've already warned in this process
		sketchWipWarningMu.Lock()
		alreadyWarned := sketchWipWarningShown
		if !alreadyWarned {
			sketchWipWarningShown = true
		}
		sketchWipWarningMu.Unlock()

		if !alreadyWarned {
			return fmt.Errorf("permission denied: cannot leave 'sketch-wip' branch. This branch is designated for change detection and auto-push; work on other branches may be lost. Warning shown once per session. Repeat command if needed for temporary operations (rebase, bisect, etc.) but return to sketch-wip afterward. Note: users can push to any branch via the Push button in the UI")
		}
	}
	return nil
}

// hasSketchWipBranchChanges checks if a git command would change the sketch-wip branch.
func hasSketchWipBranchChanges(cmd *syntax.CallExpr) bool {
	if len(cmd.Args) < 2 {
		return false
	}
	if cmd.Args[0].Lit() != "git" {
		return false
	}

	// Look for subcommands that could change the sketch-wip branch
	for i := 1; i < len(cmd.Args); i++ {
		arg := cmd.Args[i].Lit()
		switch arg {
		case "branch":
			// Check for branch rename: git branch -m sketch-wip newname or git branch -M sketch-wip newname
			if i+2 < len(cmd.Args) {
				// Look for -m or -M flag
				for j := i + 1; j < len(cmd.Args)-1; j++ {
					flag := cmd.Args[j].Lit()
					if flag == "-m" || flag == "-M" {
						// Check if sketch-wip is the source branch
						if cmd.Args[j+1].Lit() == "sketch-wip" {
							return true
						}
					}
				}
			}
		case "checkout":
			// Check for branch switching: git checkout otherbranch
			// But allow git checkout files/paths
			if i+1 < len(cmd.Args) {
				nextArg := cmd.Args[i+1].Lit()
				// Skip if it's a flag
				if !strings.HasPrefix(nextArg, "-") {
					// This might be a branch checkout - we'll be conservative and warn
					// unless it looks like a file path
					if !strings.Contains(nextArg, "/") && !strings.Contains(nextArg, ".") {
						return true
					}
				}
			}
		case "switch":
			// Check for branch switching: git switch otherbranch
			if i+1 < len(cmd.Args) {
				nextArg := cmd.Args[i+1].Lit()
				// Skip if it's a flag
				if !strings.HasPrefix(nextArg, "-") {
					return true
				}
			}
		}
	}

	return false
}
