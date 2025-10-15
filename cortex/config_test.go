package cortex

import (
	"os"
	"testing"
)

func TestLoadConfigFromEnv(t *testing.T) {
	// Set up test environment
	os.Setenv("CORTEX_ENABLED", "true")
	os.Setenv("CORTEX_CONFIDENCE_THRESHOLD", "0.8")
	os.Setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
	os.Setenv("OPENAI_API_KEY", "test-openai-key")
	os.Setenv("CORTEX_MODEL_FIRSTATTENDANT", "gpt-4o-mini")
	os.Setenv("CORTEX_MODEL_SECONDTHOUGHT", "claude-sonnet-4.5")
	defer func() {
		os.Unsetenv("CORTEX_ENABLED")
		os.Unsetenv("CORTEX_CONFIDENCE_THRESHOLD")
		os.Unsetenv("ANTHROPIC_API_KEY")
		os.Unsetenv("OPENAI_API_KEY")
		os.Unsetenv("CORTEX_MODEL_FIRSTATTENDANT")
		os.Unsetenv("CORTEX_MODEL_SECONDTHOUGHT")
	}()

	config := LoadConfigFromEnv()

	if !config.Enabled {
		t.Error("Expected Enabled=true")
	}

	if config.ConfidenceThreshold != 0.8 {
		t.Errorf("Expected ConfidenceThreshold=0.8, got %f", config.ConfidenceThreshold)
	}

	if config.APIKeys.Anthropic != "test-anthropic-key" {
		t.Errorf("Expected Anthropic key='test-anthropic-key', got '%s'", config.APIKeys.Anthropic)
	}

	if config.APIKeys.OpenAI != "test-openai-key" {
		t.Errorf("Expected OpenAI key='test-openai-key', got '%s'", config.APIKeys.OpenAI)
	}

	// Test model overrides
	if config.ModelOverrides["FirstAttendant"] != "gpt-4o-mini" {
		t.Errorf("Expected FirstAttendant override='gpt-4o-mini', got '%s'", config.ModelOverrides["FirstAttendant"])
	}

	if config.ModelOverrides["SecondThought"] != "claude-sonnet-4.5" {
		t.Errorf("Expected SecondThought override='claude-sonnet-4.5', got '%s'", config.ModelOverrides["SecondThought"])
	}
}

func TestNormalizeExpertName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"FIRSTATTENDANT", "FirstAttendant"},
		{"SECONDTHOUGHT", "SecondThought"},
		{"SECOND_THOUGHT", "SecondThought"},
		{"META_EXPERT_RECRUITER", "ExpertRecruiter"},
		{"ELITE", "Elite"},
		{"elite", "Elite"},
	}

	for _, tt := range tests {
		result := normalizeExpertName(tt.input)
		if result != tt.expected {
			t.Errorf("normalizeExpertName(%s) = %s, expected %s", tt.input, result, tt.expected)
		}
	}
}

func TestLoadConfigDefaults(t *testing.T) {
	// Clear all env vars
	os.Clearenv()

	config := LoadConfigFromEnv()

	if config.ProfilesDir != "cortex/profiles" {
		t.Errorf("Expected default ProfilesDir='cortex/profiles', got '%s'", config.ProfilesDir)
	}

	if config.ConfidenceThreshold != 0.75 {
		t.Errorf("Expected default ConfidenceThreshold=0.75, got %f", config.ConfidenceThreshold)
	}

	if config.MaxEscalations != 2 {
		t.Errorf("Expected default MaxEscalations=2, got %d", config.MaxEscalations)
	}

	if !config.Enabled {
		t.Error("Expected default Enabled=true")
	}
}
