package codereview

import (
	"testing"
	"time"
)

// TestCompareTestResults_NilPointerPanic tests the fix for the nil pointer panic
// that occurred when comparing test results between commits where a package
// exists in the after state but not in the before state.
func TestCompareTestResults_NilPointerPanic(t *testing.T) {
	// Create a CodeReviewer instance (minimal setup)
	reviewer := &CodeReviewer{
		sketchBaseRef: "main",
	}

	// Create test results where:
	// - before: empty (no packages)
	// - after: has a package with tests
	beforeResults := []testJSON{} // Empty - no packages existed before

	afterResults := []testJSON{
		{
			Time:    time.Now(),
			Package: "sketch.dev/newpkg",
			Action:  "run",
			Test:    "TestNewFunction",
		},
		{
			Time:    time.Now(),
			Package: "sketch.dev/newpkg",
			Action:  "pass",
			Test:    "TestNewFunction",
			Elapsed: 0.001,
		},
		{
			Time:    time.Now(),
			Package: "sketch.dev/newpkg",
			Action:  "pass",
			Test:    "", // package-level pass
			Elapsed: 0.001,
		},
	}

	// This should not panic - before the fix, this would cause a nil pointer dereference
	// when trying to access beforeResult.TestStatus[test] where beforeResult is nil
	regressions, err := reviewer.compareTestResults(beforeResults, afterResults)
	if err != nil {
		t.Fatalf("compareTestResults failed: %v", err)
	}

	// We expect no regressions since the new test is passing
	if len(regressions) != 0 {
		t.Errorf("Expected no regressions for passing new test, got %d", len(regressions))
	}
}

// TestCompareTestResults_NilPointerPanic_FailingTest tests the same scenario
// but with a failing test to ensure we properly detect regressions
func TestCompareTestResults_NilPointerPanic_FailingTest(t *testing.T) {
	reviewer := &CodeReviewer{
		sketchBaseRef: "main",
	}

	beforeResults := []testJSON{} // Empty - no packages existed before

	afterResults := []testJSON{
		{
			Time:    time.Now(),
			Package: "sketch.dev/newpkg",
			Action:  "run",
			Test:    "TestNewFunction",
		},
		{
			Time:    time.Now(),
			Package: "sketch.dev/newpkg",
			Action:  "fail",
			Test:    "TestNewFunction",
			Elapsed: 0.001,
		},
		{
			Time:    time.Now(),
			Package: "sketch.dev/newpkg",
			Action:  "fail",
			Test:    "", // package-level fail
			Elapsed: 0.001,
		},
	}

	// This should not panic and should detect the regression
	regressions, err := reviewer.compareTestResults(beforeResults, afterResults)
	if err != nil {
		t.Fatalf("compareTestResults failed: %v", err)
	}

	// We expect 1 regression for the failing new test
	if len(regressions) != 1 {
		t.Errorf("Expected 1 regression for failing new test, got %d", len(regressions))
	}

	if len(regressions) > 0 {
		regression := regressions[0]
		if regression.Package != "sketch.dev/newpkg" {
			t.Errorf("Expected package 'sketch.dev/newpkg', got %q", regression.Package)
		}
		if regression.Test != "TestNewFunction" {
			t.Errorf("Expected test 'TestNewFunction', got %q", regression.Test)
		}
		if regression.BeforeStatus != testStatusUnknown {
			t.Errorf("Expected before status testStatusUnknown, got %v", regression.BeforeStatus)
		}
		if regression.AfterStatus != testStatusFail {
			t.Errorf("Expected after status testStatusFail, got %v", regression.AfterStatus)
		}
	}
}

// TestCompareTestResults_ExistingPackage tests the normal case where
// a package exists in both before and after states
func TestCompareTestResults_ExistingPackage(t *testing.T) {
	reviewer := &CodeReviewer{
		sketchBaseRef: "main",
	}

	// Package exists in both before and after
	beforeResults := []testJSON{
		{
			Time:    time.Now(),
			Package: "sketch.dev/existing",
			Action:  "pass",
			Test:    "TestExisting",
			Elapsed: 0.001,
		},
		{
			Time:    time.Now(),
			Package: "sketch.dev/existing",
			Action:  "pass",
			Test:    "",
			Elapsed: 0.001,
		},
	}

	afterResults := []testJSON{
		{
			Time:    time.Now(),
			Package: "sketch.dev/existing",
			Action:  "fail",
			Test:    "TestExisting",
			Elapsed: 0.001,
		},
		{
			Time:    time.Now(),
			Package: "sketch.dev/existing",
			Action:  "fail",
			Test:    "",
			Elapsed: 0.001,
		},
	}

	// This should detect the regression from pass to fail
	regressions, err := reviewer.compareTestResults(beforeResults, afterResults)
	if err != nil {
		t.Fatalf("compareTestResults failed: %v", err)
	}

	// We expect 1 regression
	if len(regressions) != 1 {
		t.Errorf("Expected 1 regression, got %d", len(regressions))
	}

	if len(regressions) > 0 {
		regression := regressions[0]
		if regression.BeforeStatus != testStatusPass {
			t.Errorf("Expected before status testStatusPass, got %v", regression.BeforeStatus)
		}
		if regression.AfterStatus != testStatusFail {
			t.Errorf("Expected after status testStatusFail, got %v", regression.AfterStatus)
		}
	}
}

// TestHashChangedFiles tests the hash function for changed files
func TestHashChangedFiles(t *testing.T) {
	reviewer := &CodeReviewer{
		repoRoot:                 "/app",
		processedChangedFileSets: make(map[string]bool),
		reportedRelatedFiles:     make(map[string]bool),
	}

	// Test that same files in different order produce same hash
	files1 := []string{"/app/a.go", "/app/b.go"}
	files2 := []string{"/app/b.go", "/app/a.go"}

	hash1 := reviewer.hashChangedFiles(files1)
	hash2 := reviewer.hashChangedFiles(files2)

	if hash1 != hash2 {
		t.Errorf("Expected same hash for same files in different order, got %q vs %q", hash1, hash2)
	}

	// Test that different files produce different hash
	files3 := []string{"/app/a.go", "/app/c.go"}
	hash3 := reviewer.hashChangedFiles(files3)

	if hash1 == hash3 {
		t.Errorf("Expected different hash for different files, got same hash %q", hash1)
	}

	// Test single file
	files4 := []string{"/app/a.go"}
	hash4 := reviewer.hashChangedFiles(files4)

	if hash1 == hash4 {
		t.Errorf("Expected different hash for different number of files, got same hash %q", hash1)
	}
}
