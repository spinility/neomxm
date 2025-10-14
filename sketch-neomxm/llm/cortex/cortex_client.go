// Package cortex provides an LLM service that routes requests through the NeoMXM Cortex
package cortex

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"sketch.dev/llm"
)

// Client is an LLM service that routes through the Cortex HTTP API
type Client struct {
	URL    string       // Cortex server URL (default: http://localhost:8181)
	Client *http.Client // HTTP client
}

// NewClient creates a new Cortex client
func NewClient() *Client {
	url := os.Getenv("CORTEX_URL")
	if url == "" {
		url = "http://localhost:8181"
	}

	return &Client{
		URL:    url,
		Client: &http.Client{},
	}
}

// Do sends a request to the Cortex and returns the response
func (c *Client) Do(ctx context.Context, req *llm.Request) (*llm.Response, error) {
	// Convert LLM request to Cortex API request
	cortexReq := c.convertRequest(req)

	// Marshal to JSON
	body, err := json.Marshal(cortexReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.URL+"/chat", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Send request
	httpResp, err := c.Client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("cortex request failed: %w", err)
	}
	defer httpResp.Body.Close()

	// Check status
	if httpResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(httpResp.Body)
		return nil, fmt.Errorf("cortex returned %d: %s", httpResp.StatusCode, string(body))
	}

	// Parse response
	var cortexResp CortexResponse
	if err := json.NewDecoder(httpResp.Body).Decode(&cortexResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Convert to LLM response
	return c.convertResponse(&cortexResp), nil
}

// TokenContextWindow returns the token context window (delegated to cortex)
func (c *Client) TokenContextWindow() int {
	return 200000 // Max context window across all models
}

// CortexRequest matches the cortex server's ChatRequest
type CortexRequest struct {
	Messages   []CortexMessage      `json:"messages"`
	Tools      []CortexTool         `json:"tools,omitempty"`
	System     []CortexSystemMsg    `json:"system,omitempty"`
	ToolChoice *CortexToolChoiceReq `json:"tool_choice,omitempty"`
}

type CortexMessage struct {
	Role    string          `json:"role"`
	Content []CortexContent `json:"content"`
}

type CortexContent struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`

	// For tool_use
	ID    string          `json:"id,omitempty"`
	Name  string          `json:"name,omitempty"`
	Input json.RawMessage `json:"input,omitempty"`

	// For tool_result
	ToolUseID string `json:"tool_use_id,omitempty"`
	Content   string `json:"content,omitempty"`
	IsError   bool   `json:"is_error,omitempty"`
}

type CortexTool struct {
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	InputSchema json.RawMessage `json:"input_schema,omitempty"`
}

type CortexSystemMsg struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type CortexToolChoiceReq struct {
	Type string `json:"type"`
	Name string `json:"name,omitempty"`
}

// CortexResponse matches the cortex server's ChatResponse
type CortexResponse struct {
	ID         string          `json:"id"`
	Model      string          `json:"model"`
	Expert     string          `json:"expert"`
	Role       string          `json:"role"`
	Content    []CortexContent `json:"content"`
	StopReason string          `json:"stop_reason"`
	Usage      CortexUsage     `json:"usage"`
	Metadata   CortexMetadata  `json:"metadata"`
}

type CortexMetadata struct {
	ExpertUsed  string  `json:"expert_used"`
	Confidence  float64 `json:"confidence"`
	Escalated   bool    `json:"escalated"`
	EscalatedTo string  `json:"escalated_to"`
	Duration    string  `json:"duration"`
}

type CortexUsage struct {
	InputTokens  int     `json:"input_tokens"`
	OutputTokens int     `json:"output_tokens"`
	CostUSD      float64 `json:"cost_usd,omitempty"`
}

// convertRequest converts llm.Request to CortexRequest
func (c *Client) convertRequest(req *llm.Request) *CortexRequest {
	cortexReq := &CortexRequest{
		Messages: make([]CortexMessage, len(req.Messages)),
		System:   make([]CortexSystemMsg, len(req.System)),
		Tools:    make([]CortexTool, len(req.Tools)),
	}

	// Convert messages
	for i, msg := range req.Messages {
		cortexReq.Messages[i] = CortexMessage{
			Role:    roleToString(msg.Role),
			Content: make([]CortexContent, len(msg.Content)),
		}
		for j, content := range msg.Content {
			cortexReq.Messages[i].Content[j] = CortexContent{
				Type:      contentTypeToString(content.Type),
				Text:      content.Text,
				ID:        content.ID,
				Name:      content.ToolName,
				Input:     content.ToolInput,
				ToolUseID: content.ToolUseID,
				IsError:   content.ToolError,
			}
		}
	}

	// Convert system
	for i, sys := range req.System {
		cortexReq.System[i] = CortexSystemMsg{
			Type: sys.Type,
			Text: sys.Text,
		}
	}

	// Convert tools
	for i, tool := range req.Tools {
		cortexReq.Tools[i] = CortexTool{
			Name:        tool.Name,
			Description: tool.Description,
			InputSchema: tool.InputSchema,
		}
	}

	// Convert tool choice
	if req.ToolChoice != nil {
		cortexReq.ToolChoice = &CortexToolChoiceReq{
			Type: req.ToolChoice.Type.String(),
			Name: req.ToolChoice.Name,
		}
	}

	return cortexReq
}

// convertResponse converts CortexResponse to llm.Response
func (c *Client) convertResponse(resp *CortexResponse) *llm.Response {
	llmResp := &llm.Response{
		ID:         resp.ID,
		Model:      resp.Model,
		Role:       stringToRole(resp.Role),
		Content:    make([]llm.Content, len(resp.Content)),
		StopReason: stringToStopReason(resp.StopReason),
		Usage: llm.Usage{
			InputTokens:  uint64(resp.Usage.InputTokens),
			OutputTokens: uint64(resp.Usage.OutputTokens),
			CostUSD:      resp.Usage.CostUSD,
		},
		// Populate cortex metadata
		ExpertUsed:  resp.Metadata.ExpertUsed,
		Confidence:  resp.Metadata.Confidence,
		Escalated:   resp.Metadata.Escalated,
		EscalatedTo: resp.Metadata.EscalatedTo,
	}

	// Convert content
	for i, content := range resp.Content {
		llmResp.Content[i] = llm.Content{
			Type:      stringToContentType(content.Type),
			Text:      content.Text,
			ID:        content.ID,
			ToolName:  content.Name,
			ToolInput: content.Input,
		}
	}

	return llmResp
}

// Helper conversion functions
func roleToString(role llm.MessageRole) string {
	switch role {
	case llm.MessageRoleUser:
		return "user"
	case llm.MessageRoleAssistant:
		return "assistant"
	default:
		return "user"
	}
}

func stringToRole(s string) llm.MessageRole {
	switch s {
	case "user":
		return llm.MessageRoleUser
	case "assistant":
		return llm.MessageRoleAssistant
	default:
		return llm.MessageRoleAssistant
	}
}

func contentTypeToString(ct llm.ContentType) string {
	switch ct {
	case llm.ContentTypeText:
		return "text"
	case llm.ContentTypeToolUse:
		return "tool_use"
	case llm.ContentTypeToolResult:
		return "tool_result"
	default:
		return "text"
	}
}

func stringToContentType(s string) llm.ContentType {
	switch s {
	case "text":
		return llm.ContentTypeText
	case "tool_use":
		return llm.ContentTypeToolUse
	case "tool_result":
		return llm.ContentTypeToolResult
	default:
		return llm.ContentTypeText
	}
}

func stringToStopReason(s string) llm.StopReason {
	switch s {
	case "stop_sequence":
		return llm.StopReasonStopSequence
	case "max_tokens":
		return llm.StopReasonMaxTokens
	case "end_turn":
		return llm.StopReasonEndTurn
	case "tool_use":
		return llm.StopReasonToolUse
	case "refusal":
		return llm.StopReasonRefusal
	default:
		return llm.StopReasonEndTurn
	}
}
