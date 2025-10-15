package cortex

import (
	"os"
	"testing"
)

func TestDetectProvider(t *testing.T) {
	config := &Config{
		APIKeys: &APIKeys{
			Anthropic: "test-key",
			OpenAI:    "test-key",
			DeepSeek:  "test-key",
		},
		APIEndpoints: &APIEndpoints{
			Anthropic: "https://api.anthropic.com",
			OpenAI:    "https://api.openai.com/v1",
			DeepSeek:  "https://api.deepseek.com",
		},
	}

	router, err := NewModelRouter(config)
	if err != nil {
		t.Fatalf("Failed to create router: %v", err)
	}

	tests := []struct {
		model    string
		provider string
	}{
		{"claude-sonnet-4.5", "anthropic"},
		{"claude-opus-4", "anthropic"},
		{"gpt-5-nano", "openai"},
		{"gpt-4o", "openai"},
		{"gpt-4.1", "openai"},
		{"deepseek-reasoner", "deepseek"},
		{"deepseek-chat", "deepseek"},
		{"o1-preview", "openai"},
		{"o3-mini", "openai"},
	}

	for _, tt := range tests {
		provider := router.detectProvider(tt.model)
		if provider != tt.provider {
			t.Errorf("detectProvider(%s) = %s, expected %s", tt.model, provider, tt.provider)
		}
	}
}

func TestNewModelRouterRequiresAPIKey(t *testing.T) {
	// Clear environment
	os.Clearenv()

	config := &Config{
		APIKeys: &APIKeys{
			Anthropic: "",
			OpenAI:    "",
			DeepSeek:  "",
		},
		APIEndpoints: &APIEndpoints{
			Anthropic: "https://api.anthropic.com",
			OpenAI:    "https://api.openai.com/v1",
			DeepSeek:  "https://api.deepseek.com",
		},
	}

	_, err := NewModelRouter(config)
	if err == nil {
		t.Error("Expected error when no API keys are provided")
	}
}

func TestGetServiceForModel(t *testing.T) {
	config := &Config{
		APIKeys: &APIKeys{
			Anthropic: "test-anthropic-key",
			OpenAI:    "test-openai-key",
			DeepSeek:  "test-deepseek-key",
		},
		APIEndpoints: &APIEndpoints{
			Anthropic: "https://api.anthropic.com",
			OpenAI:    "https://api.openai.com/v1",
			DeepSeek:  "https://api.deepseek.com",
		},
		Debug: false,
	}

	router, err := NewModelRouter(config)
	if err != nil {
		t.Fatalf("Failed to create router: %v", err)
	}

	// Test getting service for different models
	models := []string{
		"claude-sonnet-4.5",
		"gpt-4o",
		"deepseek-reasoner",
	}

	for _, model := range models {
		svc, err := router.GetServiceForModel(model)
		if err != nil {
			t.Errorf("GetServiceForModel(%s) failed: %v", model, err)
		}
		if svc == nil {
			t.Errorf("GetServiceForModel(%s) returned nil service", model)
		}
	}

	// Test caching - getting the same model twice should return cached service
	svc1, _ := router.GetServiceForModel("claude-sonnet-4.5")
	svc2, _ := router.GetServiceForModel("claude-sonnet-4.5")
	if svc1 != svc2 {
		t.Error("Expected cached service to be returned")
	}
}
