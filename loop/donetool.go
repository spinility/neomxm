package loop

import (
	"context"
	"encoding/json"

	"github.com/spinility/sketch-neomxm/claudetool/codereview"
	"github.com/spinility/sketch-neomxm/llm"
)

// makeDoneTool creates a tool that provides a checklist to the agent. There
// are some duplicative instructions here and in the system prompt, and it's
// not as reliable as it could be. Historically, we've found that Claude ignores
// the tool results here, so we don't tell the tool to say "hey, really check this"
// at the moment, though we've tried.
func makeDoneTool(codereview *codereview.CodeReviewer) *llm.Tool {
	return &llm.Tool{
		Name:        "done",
		Description: doneDescription,
		InputSchema: json.RawMessage(doneChecklistJSONSchema),
		Run: func(ctx context.Context, input json.RawMessage) llm.ToolOut {
			// Cannot be done with a messy git.
			if err := codereview.RequireNormalGitState(ctx); err != nil {
				return llm.ErrorToolOut(err)
			}
			if err := codereview.RequireNoUncommittedChanges(ctx); err != nil {
				return llm.ErrorToolOut(err)
			}
			// Ensure that the current commit has been reviewed.
			head, err := codereview.CurrentCommit(ctx)
			if err == nil {
				needsReview := !codereview.IsInitialCommit(head) && !codereview.HasReviewed(head)
				if needsReview {
					return llm.ErrorfToolOut("codereview tool has not been run for commit %v", head)
				}
			}
			return llm.ToolOut{LLMContent: llm.TextContent("Please ask the user to review your work. Be concise - users are more likely to read shorter comments.")}
		},
	}
}

// TODO: this is ugly, maybe JSON-encode a deeply nested map[string]any instead? also ugly.
const (
	doneDescription         = `Use this tool when you have achieved the user's goal. The parameters form a checklist which you should evaluate.`
	doneChecklistJSONSchema = `{
  "type": "object",
  "properties": {
    "checked_guidance": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": {"type": "string", "enum": ["yes", "no", "n/a"]},
        "comments": {"type": "string"}
      },
      "description": "Checked for and followed any directory-specific guidance files for all modified files."
    },
    "tested": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": {"type": "string", "enum": ["yes", "no", "n/a"]},
        "comments": {"type": "string"}
      },
      "description": "If code was changed, tests were written or updated, and all tests pass."
    },
    "code_reviewed": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": {"type": "string", "enum": ["yes", "no", "n/a"]},
        "comments": {"type": "string"}
      },
      "description": "If any commits were made, the codereview tool was run and its output addressed."
    },
    "git_commit": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": {"type": "string", "enum": ["yes", "no", "n/a"]},
        "comments": {"type": "string"}
      },
      "description": "All code changes were committed. A git hook adds Co-Authored-By and Change-ID trailers. The git user is already configured correctly."
    }
  }
}`
)
