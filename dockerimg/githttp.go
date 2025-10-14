package dockerimg

import (
	"bytes"
	"context"
	"crypto/subtle"
	_ "embed"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/cgi"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"text/template"
	"time"
)

//go:embed pre-receive.sh
var preReceiveScript string

//go:embed post-receive.sh
var postReceiveScript string

type gitHTTP struct {
	gitRepoRoot string
	hooksDir    string
	pass        []byte
	browserC    chan bool // browser launch requests
}

// setupHooksDir creates a temporary directory with git hooks for this session.
//
// This automatically forwards pushes from refs/remotes/origin/Y to origin/Y
// when users push to remote tracking refs through the git HTTP backend.
//
// How it works:
//  1. User pushes to refs/remotes/origin/feature-branch
//  2. Pre-receive hook detects the pattern and extracts branch name
//  3. Hook checks if it's a force push (declined if so)
//  4. Hook runs "git push origin <commit>:feature-branch"
//  5. If origin push fails, user's push also fails
//
// Note:
//   - Error propagation from origin push to user push
//   - Session isolation with temporary hooks directory
func setupHooksDir(upstream string) (string, error) {
	hooksDir, err := os.MkdirTemp("", "sketch-git-hooks-*")
	if err != nil {
		return "", fmt.Errorf("failed to create hooks directory: %w", err)
	}

	preReceiveHook := filepath.Join(hooksDir, "pre-receive")
	if err := os.WriteFile(preReceiveHook, []byte(preReceiveScript), 0o755); err != nil {
		return "", fmt.Errorf("failed to write pre-receive hook: %w", err)
	}

	if upstream != "" {
		tmpl, err := template.New("post-receive").Parse(postReceiveScript)
		if err != nil {
			return "", fmt.Errorf("failed to parse post-receive template: %w", err)
		}
		var buf bytes.Buffer
		if err := tmpl.Execute(&buf, map[string]string{"Upstream": upstream}); err != nil {
			return "", fmt.Errorf("failed to execute post-receive template: %w", err)
		}
		postReceiveHook := filepath.Join(hooksDir, "post-receive")
		if err := os.WriteFile(postReceiveHook, buf.Bytes(), 0o755); err != nil {
			return "", fmt.Errorf("failed to write post-receive hook: %w", err)
		}
	}

	return hooksDir, nil
}

func (g *gitHTTP) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if err := recover(); err != nil {
			slog.ErrorContext(r.Context(), "gitHTTP.ServeHTTP panic", slog.Any("recovered_err", err))

			// Return an error response to the client
			http.Error(w, fmt.Sprintf("panic: %v\n", err), http.StatusInternalServerError)
		}
	}()

	// Get the Authorization header
	username, password, ok := r.BasicAuth()

	// Check if credentials were provided
	if !ok {
		// No credentials provided, return 401 Unauthorized
		w.Header().Set("WWW-Authenticate", `Basic realm="Sketch Git Repository"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		slog.InfoContext(r.Context(), "githttp: denied (basic auth)", "remote addr", r.RemoteAddr)
		return
	}

	// Check if credentials are valid
	if username != "sketch" || subtle.ConstantTimeCompare([]byte(password), g.pass) != 1 {
		w.Header().Set("WWW-Authenticate", `Basic realm="Git Repository"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		slog.InfoContext(r.Context(), "githttp: denied (basic auth)", "remote addr", r.RemoteAddr)
		return
	}

	// TODO: real mux?
	if strings.HasPrefix(r.URL.Path, "/browser") {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		defer r.Body.Close()

		select {
		case g.browserC <- true:
			slog.InfoContext(r.Context(), "open browser requested")
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Too many browser launch requests", http.StatusTooManyRequests)
		}
		return
	}

	if runtime.GOOS == "darwin" {
		// On the Mac, Docker connections show up from localhost. On Linux, the docker
		// network is more arbitrary, so we don't do this additional check there.
		if !strings.HasPrefix(r.RemoteAddr, "127.0.0.1:") {
			slog.InfoContext(r.Context(), "githttp: denied", "remote addr", r.RemoteAddr)
			http.Error(w, "no", http.StatusUnauthorized)
			return
		}
	}
	gitBin, err := exec.LookPath("git")
	if err != nil {
		http.Error(w, "no git: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Check if this is a .git/info/refs request for git-upload-pack service (which happens during git fetch)
	// Use `GIT_CURL_VERBOSE=1 git fetch origin` to inspect what's going on under the covers for git.
	if r.Method == http.MethodGet && strings.Contains(r.URL.Path, ".git/info/refs") && r.URL.Query().Get("service") == "git-upload-pack" {
		slog.InfoContext(r.Context(), "detected git info/refs request, running git fetch origin")

		// Create a context with a 5 second timeout
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		// Run git fetch origin in the background
		cmd := exec.CommandContext(ctx, gitBin, "fetch", "origin")
		cmd.Dir = g.gitRepoRoot

		// Execute the command
		output, err := cmd.CombinedOutput()
		if err != nil {
			slog.WarnContext(r.Context(), "git fetch failed",
				"error", err,
				"output", string(output))
			// We don't return here, continue with normal processing
		} else {
			slog.InfoContext(r.Context(), "git fetch completed successfully")
		}
	}

	// Dumb hack for bare repos: if the path starts with .git, and there is no .git, strip it off.
	path := r.URL.Path
	if _, err := os.Stat(filepath.Join(g.gitRepoRoot, path)); os.IsNotExist(err) {
		path = strings.TrimPrefix(path, "/.git") // turn /.git/info/refs into /info/refs
	}

	w.Header().Set("Cache-Control", "no-cache")

	var args []string
	if g.hooksDir != "" {
		args = append(args,
			"-c", "core.hooksPath="+g.hooksDir,
			"-c", "receive.denyCurrentBranch=refuse",
		)
	}
	args = append(args, "http-backend")

	h := &cgi.Handler{
		Path: gitBin,
		Args: args,
		Dir:  g.gitRepoRoot,
		Env: []string{
			"GIT_PROJECT_ROOT=" + g.gitRepoRoot,
			"PATH_INFO=" + path,
			"QUERY_STRING=" + r.URL.RawQuery,
			"REQUEST_METHOD=" + r.Method,
			"GIT_HTTP_EXPORT_ALL=true",
			"GIT_HTTP_ALLOW_REPACK=true",
			"GIT_HTTP_ALLOW_PUSH=true",
			"GIT_HTTP_VERBOSE=1",
			// We need to pass through the SSH auth sock to the CGI script
			// so that we can use the user's existing SSH key infra to authenticate.
			"SSH_AUTH_SOCK=" + os.Getenv("SSH_AUTH_SOCK"),
		},
	}
	h.ServeHTTP(w, r)
}
