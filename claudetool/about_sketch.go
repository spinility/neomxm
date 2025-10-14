package claudetool

import (
	"context"
	_ "embed"
	"encoding/json"
	"log/slog"
	"strings"
	"text/template"

	"github.com/spinility/sketch-neomxm/llm"
	"github.com/spinility/sketch-neomxm/llm/conversation"
)

// AboutSketch provides information about how to use Sketch.
var AboutSketch = &llm.Tool{
	Name:        "about_sketch",
	Description: aboutSketchDescription,
	InputSchema: llm.EmptySchema(),
	Run:         aboutSketchRun,
}

// TODO: BYO knowledge bases? could do that for strings.Lines, for example.
// TODO: support Q&A mode instead of reading full text in?

const (
	aboutSketchDescription = `Provides information about Sketch.

When to use this tool:

- The user is asking how to USE Sketch itself (not asking Sketch to perform a task)
- The user has questions about Sketch functionality, setup, or capabilities
- The user needs help with Sketch-specific concepts like running commands, secrets management, git integration
- The query is about "How do I do X in Sketch?" or "Is it possible to Y in Sketch?" or just "Help"
- The user is confused about how a Sketch feature works or how to access it
- You need to know how to interact with the host environment, e.g. port forwarding or pulling changes the user has made outside of Sketch
`
)

//go:embed about_sketch.txt
var aboutSketch string

var aboutSketchTemplate = template.Must(template.New("sketch").Parse(aboutSketch))

func aboutSketchRun(ctx context.Context, m json.RawMessage) llm.ToolOut {
	slog.InfoContext(ctx, "about_sketch called")

	info := conversation.ToolCallInfoFromContext(ctx)
	sessionID, _ := info.Convo.ExtraData["session_id"].(string)
	branch, _ := info.Convo.ExtraData["branch"].(string)
	dot := struct {
		SessionID string
		Branch    string
	}{
		SessionID: sessionID,
		Branch:    branch,
	}
	buf := new(strings.Builder)
	if err := aboutSketchTemplate.Execute(buf, dot); err != nil {
		return llm.ErrorfToolOut("template execution error: %w", err)
	}
	return llm.ToolOut{LLMContent: llm.TextContent(buf.String())}
}
