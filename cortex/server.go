package cortex

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/spinility/sketch-neomxm/llm"
)

// Server is the HTTP server for the Cortex system
type Server struct {
	cortex *Cortex
	addr   string
}

// NewServer creates a new Cortex HTTP server
func NewServer(cortex *Cortex, addr string) *Server {
	return &Server{
		cortex: cortex,
		addr:   addr,
	}
}

// ChatRequest represents an incoming chat request
type ChatRequest struct {
	Messages   []Message      `json:"messages"`
	Tools      []Tool         `json:"tools,omitempty"`
	System     []SystemMsg    `json:"system,omitempty"`
	ToolChoice *ToolChoiceReq `json:"tool_choice,omitempty"`
}

// Message represents a message in the conversation
type Message struct {
	Role    string    `json:"role"`
	Content []Content `json:"content"`
}

// Content represents message content
type Content struct {
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

// Tool represents a tool definition
type Tool struct {
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	InputSchema json.RawMessage `json:"input_schema,omitempty"`
}

// SystemMsg represents a system message
type SystemMsg struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// ToolChoiceReq represents tool choice configuration
type ToolChoiceReq struct {
	Type string `json:"type"`
	Name string `json:"name,omitempty"`
}

// ChatResponse represents the response from cortex
type ChatResponse struct {
	ID         string     `json:"id"`
	Model      string     `json:"model"`
	Expert     string     `json:"expert"`
	Role       string     `json:"role"`
	Content    []Content  `json:"content"`
	StopReason string     `json:"stop_reason"`
	Usage      UsageInfo  `json:"usage"`
	Metadata   ExpertMeta `json:"metadata,omitempty"`
}

// UsageInfo represents token usage information
type UsageInfo struct {
	InputTokens  int     `json:"input_tokens"`
	OutputTokens int     `json:"output_tokens"`
	CostUSD      float64 `json:"cost_usd,omitempty"`
}

// ExpertMeta contains metadata about expert selection
type ExpertMeta struct {
	ExpertUsed  string  `json:"expert_used"`
	Confidence  float64 `json:"confidence,omitempty"`
	Escalated   bool    `json:"escalated,omitempty"`
	EscalatedTo string  `json:"escalated_to,omitempty"`
	Duration    string  `json:"duration"`
}

// Start starts the HTTP server
func (s *Server) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/chat", s.handleChat)
	mux.HandleFunc("/experts", s.handleExperts)

	slog.Info("Starting Cortex HTTP server", "addr", s.addr)
	return http.ListenAndServe(s.addr, s.loggingMiddleware(mux))
}

// handleHealth returns server health status
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"cortex": "ready",
	})
}

// handleExperts returns available experts
func (s *Server) handleExperts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	experts := make([]map[string]interface{}, 0)
	for name, expert := range s.cortex.experts {
		experts = append(experts, map[string]interface{}{
			"name":  name,
			"model": expert.Profile.Model,
			"tier":  expert.Profile.Tier,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"experts": experts,
		"enabled": s.cortex.config.Enabled,
	})
}

// handleChat processes chat requests through the cortex
func (s *Server) handleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	start := time.Now()
	ctx := r.Context()

	// Parse request
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	// Convert to LLM request
	llmReq := s.convertToLLMRequest(&req)

	// Debug: log request details
	slog.InfoContext(ctx, "CORTEX RECEIVED REQUEST",
		"num_messages", len(llmReq.Messages),
		"num_tools", len(llmReq.Tools),
		"has_system", len(llmReq.System) > 0)
	for i, msg := range llmReq.Messages {
		slog.InfoContext(ctx, "MESSAGE",
			"index", i,
			"role", msg.Role,
			"num_content", len(msg.Content))
		if len(msg.Content) == 0 {
			slog.WarnContext(ctx, "MESSAGE HAS EMPTY CONTENT", "index", i)
		}
		for j, c := range msg.Content {
			slog.InfoContext(ctx, "CONTENT",
				"msg_index", i,
				"content_index", j,
				"type", c.Type,
				"text_len", len(c.Text),
				"has_tool_result", len(c.ToolResult) > 0,
				"tool_use_id", c.ToolUseID)
		}
	}

	// Process through cortex
	resp, err := s.cortex.ProcessRequest(ctx, llmReq)
	if err != nil {
		slog.ErrorContext(ctx, "Cortex processing failed", "error", err)
		http.Error(w, fmt.Sprintf("Processing failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Convert response
	chatResp := s.convertFromLLMResponse(resp, time.Since(start))

	// Debug: log response details
	slog.InfoContext(ctx, "SENDING RESPONSE",
		"stop_reason", chatResp.StopReason,
		"num_content", len(chatResp.Content))
	for i, c := range chatResp.Content {
		slog.InfoContext(ctx, "RESPONSE CONTENT",
			"index", i,
			"type", c.Type,
			"has_name", c.Name != "",
			"has_input", len(c.Input) > 0)
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(chatResp); err != nil {
		slog.ErrorContext(ctx, "Failed to encode response", "error", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// convertToLLMRequest converts HTTP request to LLM request
func (s *Server) convertToLLMRequest(req *ChatRequest) *llm.Request {
	llmReq := &llm.Request{
		System: make([]llm.SystemContent, len(req.System)),
		Tools:  make([]*llm.Tool, len(req.Tools)),
	}

	// Convert messages (filter out messages with empty content)
	for i, msg := range req.Messages {
		// Parse role
		var role llm.MessageRole
		switch msg.Role {
		case "user":
			role = llm.MessageRoleUser
		case "assistant":
			role = llm.MessageRoleAssistant
		default:
			role = llm.MessageRoleUser
		}

		// Filter and convert content (skip empty text blocks)
		var contents []llm.Content
		for _, content := range msg.Content {
			// Parse content type
			var contentType llm.ContentType
			switch content.Type {
			case "text":
				contentType = llm.ContentTypeText
			case "tool_use":
				contentType = llm.ContentTypeToolUse
			case "tool_result":
				contentType = llm.ContentTypeToolResult
			default:
				contentType = llm.ContentTypeText
			}

			// Skip empty text content (not allowed by Anthropic API)
			if contentType == llm.ContentTypeText && content.Text == "" {
				continue
			}

			contents = append(contents, llm.Content{
				Type:      contentType,
				Text:      content.Text,
				ID:        content.ID,
				ToolName:  content.Name,
				ToolInput: content.Input,
			})
		}

		// Only add message if it has content
		if len(contents) > 0 {
			llmReq.Messages = append(llmReq.Messages, llm.Message{
				Role:    role,
				Content: contents,
			})
		} else {
			slog.Warn("Skipping message with empty content", "index", i)
		}
	}

	// Convert system messages
	for i, sys := range req.System {
		llmReq.System[i] = llm.SystemContent{
			Type: sys.Type,
			Text: sys.Text,
		}
	}

	// Convert tools
	for i, tool := range req.Tools {
		llmReq.Tools[i] = &llm.Tool{
			Name:        tool.Name,
			Description: tool.Description,
			InputSchema: tool.InputSchema,
		}
	}

	return llmReq
}

// convertFromLLMResponse converts LLM response to HTTP response
func (s *Server) convertFromLLMResponse(resp *llm.Response, duration time.Duration) *ChatResponse {
	chatResp := &ChatResponse{
		ID:         resp.ID,
		Model:      resp.Model,
		Expert:     resp.ExpertUsed,
		Role:       toRoleString(resp.Role),
		Content:    make([]Content, len(resp.Content)),
		StopReason: toStopReasonString(resp.StopReason),
		Usage: UsageInfo{
			InputTokens:  int(resp.Usage.InputTokens),
			OutputTokens: int(resp.Usage.OutputTokens),
			CostUSD:      resp.Usage.CostUSD,
		},
		Metadata: ExpertMeta{
			ExpertUsed:  resp.ExpertUsed,
			Confidence:  resp.Confidence,
			Escalated:   resp.Escalated,
			EscalatedTo: resp.EscalatedTo,
			Duration:    duration.String(),
		},
	}

	// Convert content
	for i, content := range resp.Content {
		chatResp.Content[i] = Content{
			Type:  content.Type.String(),
			Text:  content.Text,
			ID:    content.ID,
			Name:  content.ToolName,
			Input: content.ToolInput,
		}
	}

	return chatResp
}

// toRoleString converts MessageRole to snake_case string format
func toRoleString(role llm.MessageRole) string {
	switch role {
	case llm.MessageRoleUser:
		return "user"
	case llm.MessageRoleAssistant:
		return "assistant"
	default:
		return "assistant"
	}
}

// toStopReasonString converts StopReason to snake_case string format
func toStopReasonString(reason llm.StopReason) string {
	switch reason {
	case llm.StopReasonStopSequence:
		return "stop_sequence"
	case llm.StopReasonMaxTokens:
		return "max_tokens"
	case llm.StopReasonEndTurn:
		return "end_turn"
	case llm.StopReasonToolUse:
		return "tool_use"
	case llm.StopReasonRefusal:
		return "refusal"
	default:
		return "end_turn"
	}
}

// loggingMiddleware logs HTTP requests
func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		slog.Info("HTTP request",
			"method", r.Method,
			"path", r.URL.Path,
			"remote", r.RemoteAddr,
		)
		next.ServeHTTP(w, r)
		slog.Info("HTTP response",
			"method", r.Method,
			"path", r.URL.Path,
			"duration", time.Since(start),
		)
	})
}
