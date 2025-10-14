// Package browser provides functions for opening URLs in a web browser.
package browser

import (
	"log/slog"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

// Open opens the specified URL in the system's default browser.
// It detects the OS and uses the appropriate command:
// - 'open' for macOS (with optional -a flag if SKETCH_BROWSER is set)
// - 'cmd /c start' for Windows (or direct browser executable if SKETCH_BROWSER is set)
// - 'xdg-open' for Linux and other Unix-like systems (or direct browser executable if SKETCH_BROWSER is set)
//
// If SKETCH_BROWSER environment variable is set, it will be used as the browser application:
// - On macOS: passed to 'open -a'
// - On Windows/Linux: used as direct executable
func Open(url string) {
	if strings.TrimSpace(url) == "" {
		return
	}

	browser := os.Getenv("SKETCH_BROWSER")
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "darwin":
		if browser != "" {
			cmd = exec.Command("open", "-a", browser, url)
		} else {
			cmd = exec.Command("open", url)
		}
	case "windows":
		if browser != "" {
			cmd = exec.Command(browser, url)
		} else {
			cmd = exec.Command("cmd", "/c", "start", url)
		}
	default: // Linux and other Unix-like systems
		if browser != "" {
			cmd = exec.Command(browser, url)
		} else {
			cmd = exec.Command("xdg-open", url)
		}
	}

	if b, err := cmd.CombinedOutput(); err != nil {
		slog.Debug("failed to open browser", "err", err, "url", url, "output", string(b), "browser", browser)
	}
}
