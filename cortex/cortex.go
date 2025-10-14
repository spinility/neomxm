package cortex

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/spinility/sketch-neomxm/llm"
)

// Cortex is the main orchestrator for the expert system
type Cortex struct {
	config    *Config
	experts   map[string]*Expert
	tracker   *PerformanceTracker
	llmService llm.Service
}

// NewCortex creates a new Cortex instance
func NewCortex(config *Config, llmService llm.Service) (*Cortex, error) {
	if config == nil {
		config = DefaultConfig()
	}

	// Load expert profiles
	profiles, err := LoadAllProfiles(config.ProfilesDir)
	if err != nil {
		return nil, fmt.Errorf("failed to load expert profiles: %w", err)
	}

	// Create experts
	experts := make(map[string]*Expert)
	for name, profile := range profiles {
		// Only load non-meta experts for now
		if profile.Type != "meta" {
			experts[name] = NewExpert(profile)
		}
	}

	// Create performance tracker
	tracker := NewPerformanceTracker(config.LogsDir)

	return &Cortex{
		config:     config,
		experts:    experts,
		tracker:    tracker,
		llmService: llmService,
	}, nil
}

// ExpertChoice represents the cortex's decision on which expert to use
type ExpertChoice struct {
	Expert       *Expert
	SystemPrompt string
	Reasoning    string
}

// ChooseExpert routes through the expert hierarchy and returns the chosen expert
// This is a lighter version that doesn't execute, just chooses
func (c *Cortex) ChooseExpert(ctx context.Context, request *llm.Request) (*ExpertChoice, error) {
	if !c.config.Enabled {
		return nil, nil // No expert chosen, proceed normally
	}

	slog.InfoContext(ctx, "Cortex choosing expert")

	// Start with FirstAttendant
	return c.selectExpert(ctx, "FirstAttendant", request)
}

// ProcessRequest is the main entry point for the cortex system
// It routes the request through the expert hierarchy
func (c *Cortex) ProcessRequest(ctx context.Context, request *llm.Request) (*llm.Response, error) {
	if !c.config.Enabled {
		// Cortex disabled, pass through to LLM directly
		return c.llmService.Do(ctx, request)
	}

	slog.InfoContext(ctx, "Cortex processing request")

	// Start with FirstAttendant
	return c.routeRequest(ctx, "FirstAttendant", request)
}

// routeRequest routes a request to a specific expert
func (c *Cortex) routeRequest(ctx context.Context, expertName string, request *llm.Request) (*llm.Response, error) {
	expert, exists := c.experts[expertName]
	if !exists {
		return nil, fmt.Errorf("expert %s not found", expertName)
	}

	slog.InfoContext(ctx, "Routing to expert", "expert", expertName)

	// Evaluate if expert can handle the request
	decision, err := expert.Evaluate(ctx, c.llmService, request)
	if err != nil {
		return nil, fmt.Errorf("expert evaluation failed: %w", err)
	}

	slog.InfoContext(ctx, "Expert decision",
		"expert", expertName,
		"confidence", decision.Confidence,
		"complexity", decision.Complexity,
		"escalate_to", decision.EscalateTo,
		"reasoning", decision.Reasoning,
	)

	// Check if escalation is needed
	if decision.EscalateTo != "" {
		slog.InfoContext(ctx, "Escalating to higher expert",
			"from", expertName,
			"to", decision.EscalateTo,
			"reasoning", decision.Reasoning,
		)

		// Log escalation
		c.tracker.Log(PerformanceLog{
			Expert:      expertName,
			Model:       expert.Profile.Model,
			Escalated:   true,
			EscalatedTo: decision.EscalateTo,
		})

		// Route to next expert
		return c.routeRequest(ctx, decision.EscalateTo, request)
	}

	// Expert will handle the request
	slog.InfoContext(ctx, "Expert handling request", "expert", expertName)

	// Execute the request
	resp, perfLog, err := expert.Execute(ctx, c.llmService, request)
	if err != nil {
		c.tracker.Log(*perfLog)
		_ = c.tracker.Save() // Best effort save
		return nil, fmt.Errorf("expert execution failed: %w", err)
	}

	// Log performance
	c.tracker.Log(*perfLog)

	// Save logs periodically (every 10 requests)
	if len(c.tracker.GetRecentLogs(100)) >= 10 {
		if err := c.tracker.Save(); err != nil {
			slog.WarnContext(ctx, "Failed to save performance logs", "error", err)
		}
	}

	return resp, nil
}

// selectExpert chooses an expert without executing the request
func (c *Cortex) selectExpert(ctx context.Context, expertName string, request *llm.Request) (*ExpertChoice, error) {
	expert, exists := c.experts[expertName]
	if !exists {
		return nil, fmt.Errorf("expert %s not found", expertName)
	}

	slog.InfoContext(ctx, "Evaluating expert", "expert", expertName)

	// Evaluate if expert can handle the request
	decision, err := expert.Evaluate(ctx, c.llmService, request)
	if err != nil {
		return nil, fmt.Errorf("expert evaluation failed: %w", err)
	}

	slog.InfoContext(ctx, "Expert decision",
		"expert", expertName,
		"confidence", decision.Confidence,
		"complexity", decision.Complexity,
		"escalate_to", decision.EscalateTo,
		"reasoning", decision.Reasoning,
	)

	// Check if escalation is needed
	if decision.EscalateTo != "" {
		slog.InfoContext(ctx, "Escalating to higher expert",
			"from", expertName,
			"to", decision.EscalateTo,
			"reasoning", decision.Reasoning,
		)

		// Log escalation
		c.tracker.Log(PerformanceLog{
			Expert:      expertName,
			Model:       expert.Profile.Model,
			Escalated:   true,
			EscalatedTo: decision.EscalateTo,
		})

		// Select next expert
		return c.selectExpert(ctx, decision.EscalateTo, request)
	}

	// Expert will handle the request
	slog.InfoContext(ctx, "Expert selected", "expert", expertName)

	return &ExpertChoice{
		Expert:       expert,
		SystemPrompt: expert.Profile.SystemPrompt,
		Reasoning:    decision.Reasoning,
	}, nil
}

// GetExpert returns an expert by name
func (c *Cortex) GetExpert(name string) (*Expert, bool) {
	expert, exists := c.experts[name]
	return expert, exists
}

// GetStatistics returns performance statistics
func (c *Cortex) GetStatistics() (Statistics, error) {
	logs, err := c.tracker.LoadTodaysLogs()
	if err != nil {
		return Statistics{}, err
	}
	return ComputeStatistics(logs), nil
}

// Shutdown performs cleanup when cortex is shutting down
func (c *Cortex) Shutdown(ctx context.Context) error {
	slog.InfoContext(ctx, "Cortex shutting down")
	
	// Save any remaining logs
	if err := c.tracker.Save(); err != nil {
		return fmt.Errorf("failed to save logs on shutdown: %w", err)
	}
	
	return nil
}
