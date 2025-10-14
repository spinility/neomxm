package cortex

import (
	"context"
	"testing"

	"github.com/spinility/sketch-neomxm/llm"
)

// MockLLMService is a mock LLM service for testing
type MockLLMService struct{}

func (m *MockLLMService) Do(ctx context.Context, req *llm.Request) (*llm.Response, error) {
	return &llm.Response{
		Content: []llm.Content{
			{Type: llm.ContentTypeText, Text: "Mock response"},
		},
		Usage: llm.Usage{
			InputTokens:  100,
			OutputTokens: 50,
		},
	}, nil
}

func (m *MockLLMService) TokenContextWindow() int {
	return 200000
}

func TestCortexInitialization(t *testing.T) {
	ctx := context.Background()
	mockService := &MockLLMService{}

	config := DefaultConfig()
	config.ProfilesDir = "profiles" // Relative to cortex/ directory when running tests
	cortex, err := NewCortex(config, mockService)
	if err != nil {
		t.Fatalf("Failed to initialize cortex: %v", err)
	}

	if cortex == nil {
		t.Fatal("Cortex is nil")
	}

	if len(cortex.experts) == 0 {
		t.Fatal("No experts loaded")
	}

	// Check that expected experts are loaded
	expectedExperts := []string{"FirstAttendant", "SecondThought", "Elite"}
	for _, name := range expectedExperts {
		if _, exists := cortex.experts[name]; !exists {
			t.Errorf("Expected expert %s not found", name)
		}
	}

	// Clean up
	_ = cortex.Shutdown(ctx)
}

func TestExpertSelection(t *testing.T) {
	ctx := context.Background()
	mockService := &MockLLMService{}

	config := DefaultConfig()
	config.ProfilesDir = "profiles"
	cortex, err := NewCortex(config, mockService)
	if err != nil {
		t.Fatalf("Failed to initialize cortex: %v", err)
	}
	defer cortex.Shutdown(ctx)

	// Test simple request (should use FirstAttendant)
	simpleRequest := &llm.Request{
		Messages: []llm.Message{
			{
				Role: llm.MessageRoleUser,
				Content: []llm.Content{
					{Type: llm.ContentTypeText, Text: "list files in current directory"},
				},
			},
		},
	}

	choice, err := cortex.ChooseExpert(ctx, simpleRequest)
	if err != nil {
		t.Fatalf("Expert selection failed: %v", err)
	}

	if choice == nil {
		t.Fatal("No expert chosen")
	}

	if choice.Expert.Profile.Name != "FirstAttendant" {
		t.Errorf("Expected FirstAttendant for simple task, got %s", choice.Expert.Profile.Name)
	}
}

func TestComplexityAssessment(t *testing.T) {
	tests := []struct {
		name             string
		content          string
		expectedMinScore float64
		expectedMaxScore float64
	}{
		{
			name:             "simple command",
			content:          "list files",
			expectedMinScore: 0.0,
			expectedMaxScore: 0.2,
		},
		{
			name:             "complex architecture task",
			content:          "refactor the entire architecture to use microservices and implement distributed tracing with performance optimization",
			expectedMinScore: 0.4,
			expectedMaxScore: 1.0,
		},
		{
			name:             "multi-file refactoring",
			content:          "refactor file1.go, file2.go, file3.go, file4.go to use a better design pattern",
			expectedMinScore: 0.2,
			expectedMaxScore: 0.8,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := assessComplexity(tt.content)
			if score < tt.expectedMinScore || score > tt.expectedMaxScore {
				t.Errorf("Complexity score %f not in expected range [%f, %f] for content: %s",
					score, tt.expectedMinScore, tt.expectedMaxScore, tt.content)
			}
		})
	}
}

func TestPerformanceLogging(t *testing.T) {
	tracker := NewPerformanceTracker("cortex/logs")

	log := PerformanceLog{
		Expert:       "FirstAttendant",
		Model:        "gpt-5-nano",
		TokensInput:  100,
		TokensOutput: 50,
		Success:      true,
	}

	tracker.Log(log)

	recentLogs := tracker.GetRecentLogs(10)
	if len(recentLogs) != 1 {
		t.Errorf("Expected 1 log, got %d", len(recentLogs))
	}

	if recentLogs[0].Expert != "FirstAttendant" {
		t.Errorf("Expected expert FirstAttendant, got %s", recentLogs[0].Expert)
	}
}
