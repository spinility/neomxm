package cortex

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/spinility/sketch-neomxm/llm"
	"github.com/spinility/sketch-neomxm/llm/ant"
	"github.com/spinility/sketch-neomxm/llm/oai"
)

// ModelRouter routes requests to the appropriate LLM service based on model name
type ModelRouter struct {
	config   *Config
	services map[string]llm.Service
}

// NewModelRouter creates a new model router with configured API keys
func NewModelRouter(config *Config) (*ModelRouter, error) {
	router := &ModelRouter{
		config:   config,
		services: make(map[string]llm.Service),
	}

	// Validate that we have at least one API key
	if config.APIKeys.Anthropic == "" && config.APIKeys.OpenAI == "" && config.APIKeys.DeepSeek == "" {
		return nil, fmt.Errorf("no API keys configured: set ANTHROPIC_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY")
	}

	return router, nil
}

// GetServiceForModel returns the appropriate LLM service for a given model name
func (r *ModelRouter) GetServiceForModel(modelName string) (llm.Service, error) {
	// Check cache first
	if svc, exists := r.services[modelName]; exists {
		return svc, nil
	}

	// Determine provider based on model name
	provider := r.detectProvider(modelName)

	var svc llm.Service
	var err error

	switch provider {
	case "anthropic":
		svc, err = r.createAnthropicService(modelName)
	case "openai":
		svc, err = r.createOpenAIService(modelName)
	case "deepseek":
		svc, err = r.createDeepSeekService(modelName)
	default:
		return nil, fmt.Errorf("unknown provider for model: %s", modelName)
	}

	if err != nil {
		return nil, err
	}

	// Cache the service
	r.services[modelName] = svc
	return svc, nil
}

// detectProvider determines which provider to use based on model name
func (r *ModelRouter) detectProvider(modelName string) string {
	modelLower := strings.ToLower(modelName)

	// Anthropic models
	if strings.Contains(modelLower, "claude") || strings.Contains(modelLower, "opus") || strings.Contains(modelLower, "sonnet") {
		return "anthropic"
	}

	// DeepSeek models
	if strings.Contains(modelLower, "deepseek") {
		return "deepseek"
	}

	// OpenAI models (default for GPT and most others)
	if strings.Contains(modelLower, "gpt") || strings.Contains(modelLower, "o1") || strings.Contains(modelLower, "o3") {
		return "openai"
	}

	// Default to OpenAI for unknown models
	slog.Warn("Unknown model type, defaulting to OpenAI", "model", modelName)
	return "openai"
}

// createAnthropicService creates an Anthropic service instance
func (r *ModelRouter) createAnthropicService(modelName string) (llm.Service, error) {
	if r.config.APIKeys.Anthropic == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY not set for model: %s", modelName)
	}

	return &ant.Service{
		HTTPC:     http.DefaultClient,
		URL:       r.config.APIEndpoints.Anthropic,
		APIKey:    r.config.APIKeys.Anthropic,
		Model:     modelName,
		MaxTokens: 8192, // Default, can be overridden by expert profile
		DumpLLM:   r.config.Debug,
	}, nil
}

// createOpenAIService creates an OpenAI service instance
func (r *ModelRouter) createOpenAIService(modelName string) (llm.Service, error) {
	if r.config.APIKeys.OpenAI == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY not set for model: %s", modelName)
	}

	// Map model name to OAI Model struct
	model := oai.Model{
		UserName:  modelName,
		ModelName: modelName,
		URL:       r.config.APIEndpoints.OpenAI,
		APIKeyEnv: "", // We're passing the key directly
	}

	return &oai.Service{
		HTTPC:     http.DefaultClient,
		APIKey:    r.config.APIKeys.OpenAI,
		Model:     model,
		ModelURL:  r.config.APIEndpoints.OpenAI,
		MaxTokens: 8192, // Default, can be overridden by expert profile
		DumpLLM:   r.config.Debug,
	}, nil
}

// createDeepSeekService creates a DeepSeek service instance
// DeepSeek uses OpenAI-compatible API
func (r *ModelRouter) createDeepSeekService(modelName string) (llm.Service, error) {
	if r.config.APIKeys.DeepSeek == "" {
		return nil, fmt.Errorf("DEEPSEEK_API_KEY not set for model: %s", modelName)
	}

	// DeepSeek is OpenAI-compatible
	model := oai.Model{
		UserName:  modelName,
		ModelName: modelName,
		URL:       r.config.APIEndpoints.DeepSeek,
		APIKeyEnv: "", // We're passing the key directly
	}

	return &oai.Service{
		HTTPC:     http.DefaultClient,
		APIKey:    r.config.APIKeys.DeepSeek,
		Model:     model,
		ModelURL:  r.config.APIEndpoints.DeepSeek,
		MaxTokens: 8192, // Default, can be overridden by expert profile
		DumpLLM:   r.config.Debug,
	}, nil
}

// Do executes a request using the appropriate service for the configured model
func (r *ModelRouter) Do(ctx context.Context, modelName string, request *llm.Request) (*llm.Response, error) {
	svc, err := r.GetServiceForModel(modelName)
	if err != nil {
		return nil, fmt.Errorf("failed to get service for model %s: %w", modelName, err)
	}

	if r.config.Debug {
		slog.InfoContext(ctx, "Routing request", "model", modelName, "provider", r.detectProvider(modelName))
	}

	return svc.Do(ctx, request)
}
