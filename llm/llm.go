// Package llm provides a unified interface for interacting with LLMs.
package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Service interface {
	// Do sends a request to an LLM.
	Do(context.Context, *Request) (*Response, error)
	// TokenContextWindow returns the maximum token context window size for this service
	TokenContextWindow() int
}

type SimplifiedPatcher interface {
	// UseSimplifiedPatch reports whether the service should use the simplified patch input schema.
	UseSimplifiedPatch() bool
}

func UseSimplifiedPatch(svc Service) bool {
	if sp, ok := svc.(SimplifiedPatcher); ok {
		return sp.UseSimplifiedPatch()
	}
	return false
}

// MustSchema validates that schema is a valid JSON schema and returns it as a json.RawMessage.
// It panics if the schema is invalid.
// The schema must have at least type="object" and a properties key.
func MustSchema(schema string) json.RawMessage {
	schema = strings.TrimSpace(schema)
	bytes := []byte(schema)
	var obj map[string]any
	if err := json.Unmarshal(bytes, &obj); err != nil {
		panic("failed to parse JSON schema: " + schema + ": " + err.Error())
	}
	if typ, ok := obj["type"]; !ok || typ != "object" {
		panic("JSON schema must have type='object': " + schema)
	}
	if _, ok := obj["properties"]; !ok {
		panic("JSON schema must have 'properties' key: " + schema)
	}
	return json.RawMessage(bytes)
}

func EmptySchema() json.RawMessage {
	return MustSchema(`{"type": "object", "properties": {}}`)
}

type Request struct {
	Messages   []Message
	ToolChoice *ToolChoice
	Tools      []*Tool
	System     []SystemContent
}

// Message represents a message in the conversation.
type Message struct {
	Role    MessageRole
	Content []Content
	ToolUse *ToolUse // use to control whether/which tool to use
}

// ToolUse represents a tool use in the message content.
type ToolUse struct {
	ID   string
	Name string
}

type ToolChoice struct {
	Type ToolChoiceType
	Name string
}

type SystemContent struct {
	Text  string
	Type  string
	Cache bool
}

// Tool represents a tool available to an LLM.
type Tool struct {
	Name string
	// Type is used by the text editor tool; see
	// https://docs.anthropic.com/en/docs/build-with-claude/tool-use/text-editor-tool
	Type        string
	Description string
	InputSchema json.RawMessage
	// EndsTurn indicates that this tool should cause the model to end its turn when used
	EndsTurn bool

	// The Run function is automatically called when the tool is used.
	// Run functions may be called concurrently with each other and themselves.
	// The input to Run function is the input to the tool, as provided by Claude, in compliance with the input schema.
	// The outputs from Run will be sent back to Claude.
	// If you do not want to respond to the tool call request from Claude, return ErrDoNotRespond.
	// ctx contains extra (rarely used) tool call information; retrieve it with ToolCallInfoFromContext.
	Run func(ctx context.Context, input json.RawMessage) ToolOut `json:"-"`
}

// ToolOut represents the output of a tool run.
type ToolOut struct {
	// LLMContent is the output of the tool to be sent back to the LLM.
	// May be nil on error.
	LLMContent []Content
	// Display is content to be displayed to the user.
	// The type of content is set by the tool and coordinated with the UIs.
	// It should be JSON-serializable.
	Display any
	// Error is the error (if any) that occurred during the tool run.
	// The text contents of the error will be sent back to the LLM.
	// If non-nil, LLMContent will be ignored.
	Error error
}

type Content struct {
	ID   string
	Type ContentType
	Text string

	// Media type for image content
	MediaType string

	// for thinking
	Thinking  string
	Data      string
	Signature string

	// for tool_use
	ToolName  string
	ToolInput json.RawMessage

	// for tool_result
	ToolUseID  string
	ToolError  bool
	ToolResult []Content

	// timing information for tool_result; added externally; not sent to the LLM
	ToolUseStartTime *time.Time
	ToolUseEndTime   *time.Time

	// Display is content to be displayed to the user, copied from ToolOut
	Display any

	Cache bool
}

func StringContent(s string) Content {
	return Content{Type: ContentTypeText, Text: s}
}

// ContentsAttr returns contents as a slog.Attr.
// It is meant for logging.
func ContentsAttr(contents []Content) slog.Attr {
	var contentAttrs []any // slog.Attr
	for _, content := range contents {
		var attrs []any // slog.Attr
		switch content.Type {
		case ContentTypeText:
			attrs = append(attrs, slog.String("text", content.Text))
		case ContentTypeToolUse:
			attrs = append(attrs, slog.String("tool_name", content.ToolName))
			attrs = append(attrs, slog.String("tool_input", string(content.ToolInput)))
		case ContentTypeToolResult:
			attrs = append(attrs, slog.Any("tool_result", content.ToolResult))
			attrs = append(attrs, slog.Bool("tool_error", content.ToolError))
		case ContentTypeThinking:
			attrs = append(attrs, slog.String("thinking", content.Text))
		default:
			attrs = append(attrs, slog.String("unknown_content_type", content.Type.String()))
			attrs = append(attrs, slog.Any("text", content)) // just log it all raw, better to have too much than not enough
		}
		contentAttrs = append(contentAttrs, slog.Group(content.ID, attrs...))
	}
	return slog.Group("contents", contentAttrs...)
}

type (
	MessageRole    int
	ContentType    int
	ToolChoiceType int
	StopReason     int
)

//go:generate go tool golang.org/x/tools/cmd/stringer -type=MessageRole,ContentType,ToolChoiceType,StopReason -output=llm_string.go

const (
	MessageRoleUser MessageRole = iota
	MessageRoleAssistant

	ContentTypeText ContentType = iota
	ContentTypeThinking
	ContentTypeRedactedThinking
	ContentTypeToolUse
	ContentTypeToolResult

	ToolChoiceTypeAuto ToolChoiceType = iota // default
	ToolChoiceTypeAny                        // any tool, but must use one
	ToolChoiceTypeNone                       // no tools allowed
	ToolChoiceTypeTool                       // must use the tool specified in the Name field

	StopReasonStopSequence StopReason = iota
	StopReasonMaxTokens
	StopReasonEndTurn
	StopReasonToolUse
	StopReasonRefusal
)

type Response struct {
	ID           string
	Type         string
	Role         MessageRole
	Model        string
	Content      []Content
	StopReason   StopReason
	StopSequence *string
	Usage        Usage
	StartTime    *time.Time
	EndTime      *time.Time
}

func (m *Response) ToMessage() Message {
	return Message{
		Role:    m.Role,
		Content: m.Content,
	}
}

func CostUSDFromResponse(headers http.Header) float64 {
	h := headers.Get("Skaband-Cost-Microcents")
	if h == "" {
		return 0
	}
	uc, err := strconv.ParseUint(h, 10, 64)
	if err != nil {
		slog.Warn("failed to parse cost header", "header", h)
		return 0
	}
	return float64(uc) / 100_000_000
}

// Usage represents the billing and rate-limit usage.
// Most LLM structs do not have JSON tags, to avoid accidental direct use in specific providers.
// However, the front-end uses this struct, and it relies on its JSON serialization.
// Do NOT use this struct directly when implementing an llm.Service.
type Usage struct {
	InputTokens              uint64  `json:"input_tokens"`
	CacheCreationInputTokens uint64  `json:"cache_creation_input_tokens"`
	CacheReadInputTokens     uint64  `json:"cache_read_input_tokens"`
	OutputTokens             uint64  `json:"output_tokens"`
	CostUSD                  float64 `json:"cost_usd"`
}

func (u *Usage) Add(other Usage) {
	u.InputTokens += other.InputTokens
	u.CacheCreationInputTokens += other.CacheCreationInputTokens
	u.CacheReadInputTokens += other.CacheReadInputTokens
	u.OutputTokens += other.OutputTokens
	u.CostUSD += other.CostUSD
}

func (u *Usage) String() string {
	return fmt.Sprintf("in: %d, out: %d", u.InputTokens, u.OutputTokens)
}

func (u *Usage) IsZero() bool {
	return *u == Usage{}
}

func (u *Usage) Attr() slog.Attr {
	return slog.Group("usage",
		slog.Uint64("input_tokens", u.InputTokens),
		slog.Uint64("output_tokens", u.OutputTokens),
		slog.Uint64("cache_creation_input_tokens", u.CacheCreationInputTokens),
		slog.Uint64("cache_read_input_tokens", u.CacheReadInputTokens),
		slog.Float64("cost_usd", u.CostUSD),
	)
}

// UserStringMessage creates a user message with a single text content item.
func UserStringMessage(text string) Message {
	return Message{
		Role:    MessageRoleUser,
		Content: []Content{StringContent(text)},
	}
}

// TextContent creates a simple text content for tool results.
// This is a helper function to create the most common type of tool result content.
func TextContent(text string) []Content {
	return []Content{{
		Type: ContentTypeText,
		Text: text,
	}}
}

func ErrorToolOut(err error) ToolOut {
	if err == nil {
		panic("ErrorToolOut called with nil error")
	}
	return ToolOut{
		Error: err,
	}
}

func ErrorfToolOut(format string, args ...any) ToolOut {
	return ErrorToolOut(fmt.Errorf(format, args...))
}

// DumpToFile writes LLM communication content to a timestamped file in ~/.cache/sketch/.
// For requests, it includes the URL followed by the content. For responses, it only includes the content.
// The typ parameter is used as a prefix in the filename ("request", "response").
func DumpToFile(typ string, url string, content []byte) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	cacheDir := filepath.Join(homeDir, ".cache", "sketch")
	err = os.MkdirAll(cacheDir, 0o700)
	if err != nil {
		return err
	}
	now := time.Now()
	filename := fmt.Sprintf("%s_%d.txt", typ, now.UnixMilli())
	filePath := filepath.Join(cacheDir, filename)

	// For requests, start with the URL; for responses, just write the content
	data := []byte(url)
	if url != "" {
		data = append(data, "\n\n"...)
	}
	data = append(data, content...)

	return os.WriteFile(filePath, data, 0o600)
}
