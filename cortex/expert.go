package cortex

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/spinility/sketch-neomxm/llm"
)

// Expert represents a virtual expert with a specific profile
type Expert struct {
	Profile *ExpertProfile
	Memory  *ExpertMemory
}

// ExpertMemory holds the expert's accumulated knowledge
type ExpertMemory struct {
	TaskHistory []TaskRecord
	Insights    []string
	LastUpdated time.Time
}

// TaskRecord represents a single task execution record
type TaskRecord struct {
	TaskDescription string
	Success         bool
	TokensUsed      int
	Duration        time.Duration
	Timestamp       time.Time
}

// ExpertDecision represents an expert's decision on how to handle a request
type ExpertDecision struct {
	Confidence     float64 `json:"confidence,omitempty"`
	Complexity     float64 `json:"complexity,omitempty"`
	EscalateTo     string  `json:"escalate_to,omitempty"`
	Reasoning      string  `json:"reasoning"`
	Approach       string  `json:"approach,omitempty"`
	ContextSummary string  `json:"context_summary,omitempty"`
}

// NewExpert creates a new expert with the given profile
func NewExpert(profile *ExpertProfile) *Expert {
	return &Expert{
		Profile: profile,
		Memory: &ExpertMemory{
			TaskHistory: []TaskRecord{},
			Insights:    []string{},
			LastUpdated: time.Now(),
		},
	}
}

// Evaluate asks the expert to evaluate a request and decide if they should handle it
func (e *Expert) Evaluate(ctx context.Context, llmService llm.Service, request *llm.Request) (*ExpertDecision, error) {
	// For now, we'll use a simple heuristic approach
	// In the future, this could involve an actual LLM call to assess confidence

	slog.InfoContext(ctx, "Expert evaluating request", "expert", e.Profile.Name)

	// For FirstAttendant, check confidence threshold
	if e.Profile.Name == "FirstAttendant" {
		decision := e.evaluateFirstAttendant(request)
		return decision, nil
	}

	// For SecondThought, check complexity threshold
	if e.Profile.Name == "SecondThought" {
		decision := e.evaluateSecondThought(request)
		return decision, nil
	}

	// Elite always handles the request
	return &ExpertDecision{
		Confidence: 1.0,
		Complexity: 1.0,
		Reasoning:  "Elite expert handles all escalated tasks",
		Approach:   "solve",
	}, nil
}

// evaluateFirstAttendant determines if FirstAttendant should handle the request
func (e *Expert) evaluateFirstAttendant(request *llm.Request) *ExpertDecision {
	// Extract user message content
	userContent := extractUserContent(request)
	if userContent == "" {
		return &ExpertDecision{
			Confidence: 0.3,
			EscalateTo: "SecondThought",
			Reasoning:  "No clear user content to evaluate",
		}
	}

	// Simple heuristic: check for complexity indicators
	complexityScore := assessComplexity(userContent)

	if complexityScore < 0.3 {
		// Simple task - high confidence
		return &ExpertDecision{
			Confidence: 0.85,
			Reasoning:  "Simple task matching FirstAttendant strengths",
			Approach:   "solve",
		}
	} else if complexityScore < 0.6 {
		// Medium complexity - medium confidence
		return &ExpertDecision{
			Confidence: 0.65,
			Reasoning:  "Medium complexity task, within capabilities",
			Approach:   "solve",
		}
	} else {
		// Complex task - escalate
		return &ExpertDecision{
			Confidence: 0.45,
			EscalateTo: "SecondThought",
			Reasoning:  "Task complexity exceeds FirstAttendant threshold",
		}
	}
}

// evaluateSecondThought determines if SecondThought should handle or escalate
func (e *Expert) evaluateSecondThought(request *llm.Request) *ExpertDecision {
	userContent := extractUserContent(request)
	complexityScore := assessComplexity(userContent)

	if complexityScore >= 0.85 {
		// Elite-level complexity
		return &ExpertDecision{
			Complexity:     complexityScore,
			EscalateTo:     "Elite",
			Reasoning:      "Task requires elite-level expertise",
			ContextSummary: fmt.Sprintf("Complex task: %s", truncate(userContent, 100)),
		}
	}

	// SecondThought can handle it
	return &ExpertDecision{
		Complexity: complexityScore,
		Reasoning:  "Task within SecondThought capabilities",
		Approach:   "decomposition",
	}
}

// Execute asks the expert to execute the request using the LLM service
func (e *Expert) Execute(ctx context.Context, llmService llm.Service, request *llm.Request) (*llm.Response, *PerformanceLog, error) {
	start := time.Now()

	slog.InfoContext(ctx, "Expert executing request", "expert", e.Profile.Name, "model", e.Profile.Model)

	// Prepend expert's system prompt to the request
	enhancedRequest := e.enhanceRequest(request)

	// Execute the request using the LLM service
	resp, err := llmService.Do(ctx, enhancedRequest)
	duration := time.Since(start)

	// Create performance log
	perfLog := &PerformanceLog{
		Timestamp:    start,
		Expert:       e.Profile.Name,
		Model:        e.Profile.Model,
		Duration:     duration,
		Success:      err == nil,
		TokensInput:  extractTokenCount(resp, "input"),
		TokensOutput: extractTokenCount(resp, "output"),
	}

	if err != nil {
		perfLog.ErrorMessage = err.Error()
		return nil, perfLog, fmt.Errorf("expert %s failed to execute: %w", e.Profile.Name, err)
	}

	return resp, perfLog, nil
}

// enhanceRequest prepends the expert's system prompt to the request
func (e *Expert) enhanceRequest(request *llm.Request) *llm.Request {
	enhanced := *request // Copy the request

	// Prepend expert's system prompt
	if e.Profile.SystemPrompt != "" {
		systemContent := llm.SystemContent{
			Text: e.Profile.SystemPrompt,
			Type: "text",
		}
		enhanced.System = append([]llm.SystemContent{systemContent}, enhanced.System...)
	}

	return &enhanced
}

// Helper functions

func extractUserContent(request *llm.Request) string {
	for _, msg := range request.Messages {
		if msg.Role == llm.MessageRoleUser {
			for _, content := range msg.Content {
				if content.Type == llm.ContentTypeText {
					return content.Text
				}
			}
		}
	}
	return ""
}

func assessComplexity(content string) float64 {
	// Simple heuristic-based complexity assessment
	// In the future, this could use ML or more sophisticated analysis

	contentLower := strings.ToLower(content)
	score := 0.0

	// Complexity indicators
	complexKeywords := []string{
		"architecture", "refactor", "optimize", "security",
		"algorithm", "performance", "scalability", "distributed",
		"design pattern", "best practices", "complex",
	}

	for _, keyword := range complexKeywords {
		if strings.Contains(contentLower, keyword) {
			score += 0.15
		}
	}

	// Multiple file mentions
	if strings.Count(contentLower, "file") > 3 || strings.Count(contentLower, ".go") > 3 {
		score += 0.2
	}

	// Long content suggests complexity
	if len(content) > 500 {
		score += 0.1
	}
	if len(content) > 1000 {
		score += 0.1
	}

	// Cap at 1.0
	if score > 1.0 {
		score = 1.0
	}

	return score
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func extractTokenCount(resp *llm.Response, tokenType string) int {
	if resp == nil {
		return 0
	}
	if tokenType == "input" {
		return int(resp.Usage.InputTokens)
	}
	return int(resp.Usage.OutputTokens)
}

// ParseExpertDecision attempts to extract an ExpertDecision from the response content
func ParseExpertDecision(content string) (*ExpertDecision, error) {
	// Look for JSON block in the content
	start := strings.Index(content, "```json")
	if start == -1 {
		start = strings.Index(content, "{")
		if start == -1 {
			return nil, fmt.Errorf("no JSON decision found in response")
		}
	} else {
		start += len("```json")
	}

	end := strings.Index(content[start:], "```")
	if end == -1 {
		end = strings.LastIndex(content, "}")
		if end == -1 {
			return nil, fmt.Errorf("no closing brace found in response")
		}
		end++ // Include the closing brace
	} else {
		end = start + end
	}

	jsonStr := strings.TrimSpace(content[start:end])

	var decision ExpertDecision
	if err := json.Unmarshal([]byte(jsonStr), &decision); err != nil {
		return nil, fmt.Errorf("failed to parse decision JSON: %w", err)
	}

	return &decision, nil
}
