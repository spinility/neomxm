package termui

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"text/template"
	"time"

	"github.com/dustin/go-humanize"
	"github.com/fatih/color"
	"golang.org/x/term"
	"sketch.dev/loop"
)

var (
	// toolUseTemplTxt defines how tool invocations appear in the terminal UI.
	// Keep this template in sync with the tools defined in claudetool package
	// and registered in loop/agent.go.
	// Add formatting for new tools as they are created.
	// TODO: should this be part of tool definition to make it harder to forget to set up?
	toolUseTemplTxt = `{{if .msg.ToolError}}〰️ {{end -}}
{{if eq .msg.ToolName "think" -}}
 🧠 {{.input.thoughts -}}
{{else if eq .msg.ToolName "todo_read" -}}
 📋 Reading todo list
{{else if eq .msg.ToolName "todo_write" }}
{{range .input.tasks}}{{if eq .status "queued"}}⚪{{else if eq .status "in-progress"}}🦉{{else if eq .status "completed"}}✅{{end}} {{.task}}
{{end}}
{{else if eq .msg.ToolName "keyword_search" -}}
 🔍 {{ .input.query}}: {{.input.search_terms -}}
{{else if eq .msg.ToolName "bash" -}}
 🖥️  {{if .input.background}}🥷  {{end}}{{if .input.slow_ok}}🐢  {{end}}{{ .input.command -}}
{{else if eq .msg.ToolName "patch" -}}
 ⌨️  {{.input.path -}}
{{else if eq .msg.ToolName "done" -}}
{{/* nothing to show here, the agent will write more in its next message */}}
{{else if eq .msg.ToolName "about_sketch" -}}
📚 About Sketch
{{else if eq .msg.ToolName "codereview" -}}
 🐛  Running automated code review, may be slow
{{else if eq .msg.ToolName "browser_navigate" -}}
 🌐 {{.input.url -}}
{{else if eq .msg.ToolName "browser_eval" -}}
 📱 {{.input.expression -}}
{{else if eq .msg.ToolName "browser_take_screenshot" -}}
 📸 Screenshot
{{else if eq .msg.ToolName "browser_resize" -}}
 🖼️  {{.input.width}}x{{.input.height -}}
{{else if eq .msg.ToolName "read_image" -}}
 🖼️  {{.input.path -}}
{{else if eq .msg.ToolName "browser_recent_console_logs" -}}
 📜 Console logs
{{else if eq .msg.ToolName "browser_clear_console_logs" -}}
 🧹 Clear console logs
{{else if eq .msg.ToolName "list_recent_sketch_sessions" -}}
 📚 List recent sketch sessions
{{else if eq .msg.ToolName "read_sketch_session" -}}
 📖 Read session {{.input.session_id}}
{{else -}}
 🛠️  {{ .msg.ToolName}}: {{.msg.ToolInput -}}
{{end -}}
`
	toolUseTmpl = template.Must(template.New("tool_use").Parse(toolUseTemplTxt))
)

type TermUI struct {
	stdin  *os.File
	stdout *os.File
	stderr *os.File

	agent   loop.CodingAgent
	httpURL string

	trm *term.Terminal

	// the chatMsgCh channel is for "conversation" messages, like responses to user input
	// from the LLM, or output from executing slash-commands issued by the user.
	chatMsgCh chan chatMessage

	// the log channel is for secondary messages, like logging, errors, and debug information
	// from local and remove subproceses.
	termLogCh chan string

	// protects following
	mu       sync.Mutex
	oldState *term.State
	// Tracks branches that were pushed during the session
	pushedBranches map[string]struct{}

	// Pending message count, for graceful shutdown
	messageWaitGroup sync.WaitGroup

	currentSlug string
	titlePushed bool
}

type chatMessage struct {
	idx      int
	sender   string
	content  string
	thinking bool
}

func New(agent loop.CodingAgent, httpURL string) *TermUI {
	return &TermUI{
		agent:          agent,
		stdin:          os.Stdin,
		stdout:         os.Stdout,
		stderr:         os.Stderr,
		httpURL:        httpURL,
		chatMsgCh:      make(chan chatMessage, 1),
		termLogCh:      make(chan string, 1),
		pushedBranches: make(map[string]struct{}),
	}
}

func (ui *TermUI) Run(ctx context.Context) error {
	fmt.Println(`🌐 ` + ui.httpURL + `/`)
	fmt.Println(`💬 type 'help' for help`)
	fmt.Println()

	// Start up the main terminal UI:
	if err := ui.initializeTerminalUI(ctx); err != nil {
		return err
	}
	go ui.receiveMessagesLoop(ctx)
	if err := ui.inputLoop(ctx); err != nil {
		return err
	}
	return nil
}

func (ui *TermUI) HandleToolUse(resp *loop.AgentMessage) {
	inputData := map[string]any{}
	if err := json.Unmarshal([]byte(resp.ToolInput), &inputData); err != nil {
		ui.AppendSystemMessage("error: %v", err)
		return
	}
	buf := bytes.Buffer{}
	if err := toolUseTmpl.Execute(&buf, map[string]any{"msg": resp, "input": inputData, "output": resp.ToolResult, "branch_prefix": ui.agent.BranchPrefix()}); err != nil {
		ui.AppendSystemMessage("error: %v", err)
		return
	}
	ui.AppendSystemMessage("%s\n", buf.String())
}

func (ui *TermUI) receiveMessagesLoop(ctx context.Context) {
	it := ui.agent.NewIterator(ctx, 0)
	bold := color.New(color.Bold).SprintFunc()
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		resp := it.Next()
		if resp == nil {
			return
		}
		if resp.HideOutput {
			continue
		}
		// Typically a user message will start the thinking and a (top-level
		// conversation) end of turn will stop it.
		thinking := !(resp.EndOfTurn && resp.ParentConversationID == nil)

		switch resp.Type {
		case loop.AgentMessageType:
			ui.AppendChatMessage(chatMessage{thinking: thinking, idx: resp.Idx, sender: "🕴️ ", content: resp.Content})
		case loop.ToolUseMessageType:
			ui.HandleToolUse(resp)
		case loop.ErrorMessageType:
			ui.AppendSystemMessage("❌ %s", resp.Content)
		case loop.BudgetMessageType:
			ui.AppendSystemMessage("💰 %s", resp.Content)
		case loop.AutoMessageType:
			ui.AppendSystemMessage("🧐 %s", resp.Content)
		case loop.UserMessageType:
			ui.AppendChatMessage(chatMessage{thinking: thinking, idx: resp.Idx, sender: "🦸", content: resp.Content})
		case loop.CommitMessageType:
			// Display each commit in the terminal
			for _, commit := range resp.Commits {
				if commit.PushedBranch != "" {
					// Check if we should show a GitHub link
					githubURL := ui.getGitHubBranchURL(commit.PushedBranch)
					if githubURL != "" {
						ui.AppendSystemMessage("🔄 new commit: [%s] %s\npushed to: %s\n🔗 %s", commit.Hash[:8], commit.Subject, bold(commit.PushedBranch), githubURL)
					} else {
						ui.AppendSystemMessage("🔄 new commit: [%s] %s\npushed to: %s", commit.Hash[:8], commit.Subject, bold(commit.PushedBranch))
					}

					// Track the pushed branch in our map
					ui.mu.Lock()
					ui.pushedBranches[commit.PushedBranch] = struct{}{}
					ui.mu.Unlock()
				} else {
					ui.AppendSystemMessage("🔄 new commit: [%s] %s", commit.Hash[:8], commit.Subject)
				}
			}
		case loop.PortMessageType:
			ui.AppendSystemMessage("🔌 %s", resp.Content)
		case loop.SlugMessageType:
			ui.updateTitleWithSlug(resp.Content)
		case loop.CompactMessageType:
			// TODO: print something for compaction?
		default:
			ui.AppendSystemMessage("❌ Unexpected Message Type %s %v", resp.Type, resp)
		}
	}
}

func (ui *TermUI) inputLoop(ctx context.Context) error {
	for {
		line, err := ui.trm.ReadLine()
		if errors.Is(err, io.EOF) {
			ui.AppendSystemMessage("\n")
			line = "exit"
		} else if err != nil {
			return err
		}

		line = strings.TrimSpace(line)

		switch line {
		case "?", "help":
			ui.AppendSystemMessage(`General use:
Use chat to ask sketch to tackle a task or answer a question about this repo.

Special commands:
- help, ?             : Show this help message
- budget              : Show original budget
- usage, cost         : Show current token usage and cost
- browser, open, b    : Open current conversation in browser
- stop, cancel, abort : Cancel the current operation
- exit, quit, q       : Exit sketch
- ! <command>         : Execute a shell command (e.g. !ls -la)`)
		case "budget":
			originalBudget := ui.agent.OriginalBudget()
			ui.AppendSystemMessage("💰 Budget summary:")

			ui.AppendSystemMessage("- Max total cost: %0.2f", originalBudget.MaxDollars)
		case "browser", "open", "b", "v": // "v" is a common typo for "b"
			if ui.httpURL != "" {
				ui.AppendSystemMessage("🌐 Opening %s in browser", ui.httpURL)
				go ui.agent.OpenBrowser(ui.httpURL)
			} else {
				ui.AppendSystemMessage("❌ No web URL available for this session")
			}
		case "usage", "cost":
			totalUsage := ui.agent.TotalUsage()
			ui.AppendSystemMessage("💰 Current usage summary:")
			ui.AppendSystemMessage("- Input tokens: %s", humanize.Comma(int64(totalUsage.TotalInputTokens())))
			ui.AppendSystemMessage("- Output tokens: %s", humanize.Comma(int64(totalUsage.OutputTokens)))
			ui.AppendSystemMessage("- Responses: %d", totalUsage.Responses)
			ui.AppendSystemMessage("- Wall time: %s", totalUsage.WallTime().Round(time.Second))
			ui.AppendSystemMessage("- Total cost: $%0.2f", totalUsage.TotalCostUSD)
		case "bye", "exit", "q", "quit":
			ui.trm.SetPrompt("")
			// Display final usage stats
			totalUsage := ui.agent.TotalUsage()
			ui.AppendSystemMessage("💰 Final usage summary:")
			ui.AppendSystemMessage("- Input tokens: %s", humanize.Comma(int64(totalUsage.TotalInputTokens())))
			ui.AppendSystemMessage("- Output tokens: %s", humanize.Comma(int64(totalUsage.OutputTokens)))
			ui.AppendSystemMessage("- Responses: %d", totalUsage.Responses)
			ui.AppendSystemMessage("- Wall time: %s", totalUsage.WallTime().Round(time.Second))
			ui.AppendSystemMessage("- Total cost: $%0.2f", totalUsage.TotalCostUSD)

			// Display pushed branches
			ui.mu.Lock()
			if len(ui.pushedBranches) > 0 {
				// Convert map keys to a slice for display
				branches := make([]string, 0, len(ui.pushedBranches))
				for branch := range ui.pushedBranches {
					branches = append(branches, branch)
				}

				initialCommitRef := getShortSHA(ui.agent.SketchGitBase())
				if len(branches) == 1 {
					ui.AppendSystemMessage("\n🔄 Branch pushed during session: %s", branches[0])
					// Add GitHub link if available
					if githubURL := ui.getGitHubBranchURL(branches[0]); githubURL != "" {
						ui.AppendSystemMessage("🔗 %s", githubURL)
					}
					ui.AppendSystemMessage("🍒 Cherry-pick those changes: git cherry-pick %s..%s", initialCommitRef, branches[0])
					ui.AppendSystemMessage("🔀 Merge those changes:       git merge %s", branches[0])
					ui.AppendSystemMessage("🗑️  Delete the branch:         git branch -D %s", branches[0])
				} else {
					ui.AppendSystemMessage("\n🔄 Branches pushed during session:")
					for _, branch := range branches {
						ui.AppendSystemMessage("- %s", branch)
						// Add GitHub link if available
						if githubURL := ui.getGitHubBranchURL(branch); githubURL != "" {
							ui.AppendSystemMessage("  🔗 %s", githubURL)
						}
					}
					ui.AppendSystemMessage("\n🍒 To add all those changes to your branch:")
					for _, branch := range branches {
						ui.AppendSystemMessage("git cherry-pick %s..%s", initialCommitRef, branch)
					}
					ui.AppendSystemMessage("\n🔀                              or:")
					for _, branch := range branches {
						ui.AppendSystemMessage("git merge %s", branch)
					}

					ui.AppendSystemMessage("\n🗑️  To delete branches:")
					for _, branch := range branches {
						ui.AppendSystemMessage("git branch -D %s", branch)
					}
				}
			}
			ui.mu.Unlock()

			ui.AppendSystemMessage("\n👋 Goodbye!")
			// Wait for all pending messages to be processed before exiting
			ui.messageWaitGroup.Wait()
			return nil
		case "stop", "cancel", "abort":
			ui.agent.CancelTurn(fmt.Errorf("user canceled the operation"))
		case "panic":
			panic("user forced a panic")
		default:
			if line == "" {
				continue
			}
			if strings.HasPrefix(line, "!") {
				// Execute as shell command
				line = line[1:] // remove the '!' prefix
				sendToLLM := strings.HasPrefix(line, "!")
				if sendToLLM {
					line = line[1:] // remove the second '!'
				}

				// Create a cmd and run it
				// TODO: ui.trm contains a mutex inside its write call.
				// It is potentially safe to attach ui.trm directly to this
				// cmd object's Stdout/Stderr and stream the output.
				// That would make a big difference for, e.g. wget.
				cmd := exec.Command("bash", "-c", line)
				out, err := cmd.CombinedOutput()
				ui.AppendSystemMessage("%s", out)
				if err != nil {
					ui.AppendSystemMessage("❌ Command error: %v", err)
				}
				if sendToLLM {
					// Send the command and its output to the agent
					message := fmt.Sprintf("I ran the command: `%s`\nOutput:\n```\n%s```", line, out)
					if err != nil {
						message += fmt.Sprintf("\n\nError: %v", err)
					}
					ui.agent.UserMessage(ctx, message)
				}
				continue
			}

			// Send it to the LLM
			// chatMsg := chatMessage{sender: "you", content: line}
			// ui.sendChatMessage(chatMsg)
			ui.agent.UserMessage(ctx, line)
		}
	}
}

func (ui *TermUI) updatePrompt(thinking bool) {
	var t string
	if thinking {
		// Emoji don't seem to work here? Messes up my terminal.
		t = " *"
	}
	p := fmt.Sprintf("%s%s> ", ui.agent.Slug(), t)
	ui.trm.SetPrompt(p)
}

func (ui *TermUI) initializeTerminalUI(ctx context.Context) error {
	ui.mu.Lock()
	defer ui.mu.Unlock()

	if !term.IsTerminal(int(ui.stdin.Fd())) {
		return fmt.Errorf("this command requires terminal I/O when termui=true")
	}

	oldState, err := term.MakeRaw(int(ui.stdin.Fd()))
	if err != nil {
		return err
	}
	ui.oldState = oldState
	ui.trm = term.NewTerminal(ui.stdin, "")
	width, height, err := term.GetSize(int(ui.stdin.Fd()))
	if err != nil {
		return fmt.Errorf("get terminal size: %v", err)
	}
	ui.trm.SetSize(width, height)
	// Handle terminal resizes...
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGWINCH)
	go func() {
		for {
			<-sig
			newWidth, newHeight, err := term.GetSize(int(ui.stdin.Fd()))
			if err != nil {
				continue
			}
			if newWidth != width || newHeight != height {
				width, height = newWidth, newHeight
				ui.trm.SetSize(width, height)
			}
		}
	}()

	ui.updatePrompt(false)
	ui.pushTerminalTitle()
	ui.setTerminalTitle("sketch")

	// This is the only place where we should call fe.trm.Write:
	go func() {
		var lastMsg *chatMessage
		for {
			select {
			case <-ctx.Done():
				return
			case msg := <-ui.chatMsgCh:
				func() {
					defer ui.messageWaitGroup.Done()
					// Update prompt before writing, because otherwise it doesn't redraw the prompt.
					ui.updatePrompt(msg.thinking)
					lastMsg = &msg
					// Sometimes claude doesn't say anything when it runs tools.
					// No need to output anything in that case.
					if strings.TrimSpace(msg.content) == "" {
						return
					}
					s := fmt.Sprintf("%s %s\n", msg.sender, msg.content)
					ui.trm.Write([]byte(s))
				}()
			case logLine := <-ui.termLogCh:
				func() {
					defer ui.messageWaitGroup.Done()
					if lastMsg != nil {
						ui.updatePrompt(lastMsg.thinking)
					} else {
						ui.updatePrompt(false)
					}
					b := []byte(logLine + "\n")
					ui.trm.Write(b)
				}()
			}
		}
	}()

	return nil
}

func (ui *TermUI) RestoreOldState() error {
	ui.mu.Lock()
	defer ui.mu.Unlock()
	ui.setTerminalTitle("")
	ui.popTerminalTitle()
	return term.Restore(int(ui.stdin.Fd()), ui.oldState)
}

// AppendChatMessage is for showing responses the user's request, conversational dialog etc
func (ui *TermUI) AppendChatMessage(msg chatMessage) {
	ui.messageWaitGroup.Add(1)
	ui.chatMsgCh <- msg
}

// AppendSystemMessage is for debug information, errors and such that are not part of the "conversation" per se,
// but still need to be shown to the user.
func (ui *TermUI) AppendSystemMessage(fmtString string, args ...any) {
	ui.messageWaitGroup.Add(1)
	ui.termLogCh <- fmt.Sprintf(fmtString, args...)
}

// getShortSHA returns the short SHA for the given git reference, falling back to the original SHA on error.
func getShortSHA(sha string) string {
	cmd := exec.Command("git", "rev-parse", "--short", sha)
	shortSha, err := cmd.Output()
	if err == nil {
		shortStr := strings.TrimSpace(string(shortSha))
		if shortStr != "" {
			return shortStr
		}
	}
	return sha
}

// isGitHubRepo checks if the git origin URL is a GitHub repository
func (ui *TermUI) isGitHubRepo() bool {
	gitOrigin := ui.agent.GitOrigin()
	if gitOrigin == "" {
		return false
	}

	// Common GitHub URL patterns
	patterns := []string{
		`^https://github\.com/[^/]+/[^/\s.]+(?:\.git)?`,
		`^git@github\.com:[^/]+/[^/\s.]+(?:\.git)?`,
		`^git://github\.com/[^/]+/[^/\s.]+(?:\.git)?`,
	}

	for _, pattern := range patterns {
		if matched, _ := regexp.MatchString(pattern, gitOrigin); matched {
			return true
		}
	}
	return false
}

// getGitHubBranchURL generates a GitHub branch URL if conditions are met
func (ui *TermUI) getGitHubBranchURL(branchName string) string {
	if !ui.agent.LinkToGitHub() || branchName == "" {
		return ""
	}

	gitOrigin := ui.agent.GitOrigin()
	if gitOrigin == "" || !ui.isGitHubRepo() {
		return ""
	}

	// Extract owner and repo from GitHub URL
	patterns := []string{
		`^https://github\.com/([^/]+)/([^/\s.]+)(?:\.git)?`,
		`^git@github\.com:([^/]+)/([^/\s.]+)(?:\.git)?`,
		`^git://github\.com/([^/]+)/([^/\s.]+)(?:\.git)?`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(gitOrigin)
		if len(matches) == 3 {
			owner := matches[1]
			repo := matches[2]
			return fmt.Sprintf("https://github.com/%s/%s/tree/%s", owner, repo, branchName)
		}
	}
	return ""
}

// pushTerminalTitle pushes the current terminal title onto the title stack
// Only works on xterm-compatible terminals, but does no harm elsewhere
func (ui *TermUI) pushTerminalTitle() {
	fmt.Fprintf(ui.stderr, "\033[22;0t")
	ui.titlePushed = true
}

// popTerminalTitle pops the terminal title from the title stack
func (ui *TermUI) popTerminalTitle() {
	if ui.titlePushed {
		fmt.Fprintf(ui.stderr, "\033[23;0t")
		ui.titlePushed = false
	}
}

func (ui *TermUI) setTerminalTitle(title string) {
	fmt.Fprintf(ui.stderr, "\033]0;%s\007", title)
}

// updateTitleWithSlug updates the terminal title with slug slug
func (ui *TermUI) updateTitleWithSlug(slug string) {
	ui.mu.Lock()
	defer ui.mu.Unlock()
	ui.currentSlug = slug
	title := "sketch"
	if slug != "" {
		title = fmt.Sprintf("sketch: %s", slug)
	}
	ui.setTerminalTitle(title)
}
