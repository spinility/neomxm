package cortex

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Config holds the cortex configuration
type Config struct {
	ProfilesDir string
	LogsDir     string
	Enabled     bool
}

// DefaultConfig returns the default cortex configuration
func DefaultConfig() *Config {
	return &Config{
		ProfilesDir: "cortex/profiles",
		LogsDir:     "cortex/logs",
		Enabled:     true,
	}
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
