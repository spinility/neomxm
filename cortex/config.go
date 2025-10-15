package cortex

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

// Config holds the cortex configuration
type Config struct {
	ProfilesDir              string
	LogsDir                  string
	Enabled                  bool
	ConfidenceThreshold      float64
	EliteComplexityThreshold float64
	MaxEscalations           int
	TrackCosts               bool
	CostAlertThreshold       float64
	Debug                    bool
	DryRun                   bool
	ModelOverrides           map[string]string // Expert name -> model name
	APIKeys                  *APIKeys
	APIEndpoints             *APIEndpoints
}

// APIKeys holds all API keys for different providers
type APIKeys struct {
	Anthropic string
	OpenAI    string
	DeepSeek  string
}

// APIEndpoints holds custom API endpoints (optional)
type APIEndpoints struct {
	Anthropic string
	OpenAI    string
	DeepSeek  string
}

// LoadConfigFromEnv loads configuration from environment variables
// Falls back to defaults for optional values
func LoadConfigFromEnv() *Config {
	config := &Config{
		ProfilesDir:              getEnvOrDefault("CORTEX_PROFILES_DIR", "cortex/profiles"),
		LogsDir:                  getEnvOrDefault("CORTEX_LOGS_DIR", "cortex/logs"),
		Enabled:                  getEnvBool("CORTEX_ENABLED", true),
		ConfidenceThreshold:      getEnvFloat("CORTEX_CONFIDENCE_THRESHOLD", 0.75),
		EliteComplexityThreshold: getEnvFloat("CORTEX_ELITE_COMPLEXITY_THRESHOLD", 0.85),
		MaxEscalations:           getEnvInt("CORTEX_MAX_ESCALATIONS", 2),
		TrackCosts:               getEnvBool("CORTEX_TRACK_COSTS", true),
		CostAlertThreshold:       getEnvFloat("CORTEX_COST_ALERT_THRESHOLD", 0.50),
		Debug:                    getEnvBool("CORTEX_DEBUG", false),
		DryRun:                   getEnvBool("CORTEX_DRY_RUN", false),
		ModelOverrides:           loadModelOverrides(),
		APIKeys: &APIKeys{
			Anthropic: os.Getenv("ANTHROPIC_API_KEY"),
			OpenAI:    os.Getenv("OPENAI_API_KEY"),
			DeepSeek:  os.Getenv("DEEPSEEK_API_KEY"),
		},
		APIEndpoints: &APIEndpoints{
			Anthropic: getEnvOrDefault("ANTHROPIC_API_BASE", "https://api.anthropic.com/v1/messages"),
			OpenAI:    getEnvOrDefault("OPENAI_API_BASE", "https://api.openai.com/v1"),
			DeepSeek:  getEnvOrDefault("DEEPSEEK_API_BASE", "https://api.deepseek.com"),
		},
	}

	return config
}

// DefaultConfig returns the default cortex configuration
// Deprecated: Use LoadConfigFromEnv() instead
func DefaultConfig() *Config {
	return LoadConfigFromEnv()
}

// loadModelOverrides loads model overrides from environment variables
// Format: CORTEX_MODEL_<EXPERT_NAME>=model-name
func loadModelOverrides() map[string]string {
	overrides := make(map[string]string)
	prefix := "CORTEX_MODEL_"

	for _, env := range os.Environ() {
		if strings.HasPrefix(env, prefix) {
			parts := strings.SplitN(env, "=", 2)
			if len(parts) == 2 {
				expertName := strings.TrimPrefix(parts[0], prefix)
				modelName := parts[1]
				// Normalize expert name to match profile names
				expertName = normalizeExpertName(expertName)
				overrides[expertName] = modelName
			}
		}
	}

	return overrides
}

// normalizeExpertName converts environment variable format to profile name format
// e.g., "FIRSTATTENDANT" -> "FirstAttendant", "META_EXPERT_RECRUITER" -> "ExpertRecruiter"
// Special handling for known expert names to match exact profile names
func normalizeExpertName(envName string) string {
	// Direct mapping for known experts
	knownExperts := map[string]string{
		"FIRSTATTENDANT":            "FirstAttendant",
		"SECONDTHOUGHT":             "SecondThought",
		"ELITE":                     "Elite",
		"META_EXPERT_RECRUITER":     "ExpertRecruiter",
		"META_MEMORY_SUMMARIZER":    "MemorySummarizer",
		"META_PERFORMANCE_ANALYZER": "PerformanceAnalyzer",
	}

	if normalized, exists := knownExperts[strings.ToUpper(envName)]; exists {
		return normalized
	}

	// Generic normalization for custom experts
	parts := strings.Split(strings.ToLower(envName), "_")
	for i, part := range parts {
		if len(part) > 0 {
			parts[i] = strings.ToUpper(part[:1]) + part[1:]
		}
	}
	return strings.Join(parts, "")
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	b, err := strconv.ParseBool(value)
	if err != nil {
		return defaultValue
	}
	return b
}

func getEnvFloat(key string, defaultValue float64) float64 {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	f, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return defaultValue
	}
	return f
}

func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	i, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return i
}

// ExpertProfile represents an expert's configuration loaded from YAML
type ExpertProfile struct {
	Name                     string   `yaml:"name"`
	Model                    string   `yaml:"model"`
	Tier                     int      `yaml:"tier,omitempty"`
	Type                     string   `yaml:"type,omitempty"` // "" for regular, "meta" for meta-experts
	Category                 string   `yaml:"category,omitempty"`
	ConfidenceThreshold      float64  `yaml:"confidence_threshold,omitempty"`
	EliteComplexityThreshold float64  `yaml:"elite_complexity_threshold,omitempty"`
	Strengths                []string `yaml:"strengths"`
	Weaknesses               []string `yaml:"weaknesses,omitempty"`
	SystemPrompt             string   `yaml:"system_prompt"`
	MaxTokens                int      `yaml:"max_tokens"`
	Temperature              float64  `yaml:"temperature"`
}

// LoadExpertProfile loads an expert profile from a YAML file
func LoadExpertProfile(path string) (*ExpertProfile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read profile %s: %w", path, err)
	}

	var profile ExpertProfile
	if err := yaml.Unmarshal(data, &profile); err != nil {
		return nil, fmt.Errorf("failed to parse profile %s: %w", path, err)
	}

	return &profile, nil
}

// LoadAllProfiles loads all expert profiles from the profiles directory
func LoadAllProfiles(profilesDir string) (map[string]*ExpertProfile, error) {
	profiles := make(map[string]*ExpertProfile)

	entries, err := os.ReadDir(profilesDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read profiles directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".yaml" {
			continue
		}

		path := filepath.Join(profilesDir, entry.Name())
		profile, err := LoadExpertProfile(path)
		if err != nil {
			return nil, err
		}

		profiles[profile.Name] = profile
	}

	return profiles, nil
}
