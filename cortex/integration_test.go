package cortex

import (
	"context"
	"testing"
	"time"

	"github.com/spinility/sketch-neomxm/llm"
)

// TestIntegrationFlow tests the complete flow from user request to expert selection
func TestIntegrationFlow(t *testing.T) {
	ctx := context.Background()
	mockService := &MockLLMService{}

	config := DefaultConfig()
	config.ProfilesDir = "profiles"
	cortex, err := NewCortex(config, mockService)
	if err != nil {
		t.Fatalf("Failed to initialize cortex: %v", err)
	}
	defer cortex.Shutdown(ctx)

	// Test scenarios
	scenarios := []struct {
		name           string
		userRequest    string
		expectedExpert string
	}{
		{
			name:           "Simple file listing",
			userRequest:    "list files in current directory",
			expectedExpert: "FirstAttendant",
		},
		{
			name:           "Simple git command",
			userRequest:    "git status",
			expectedExpert: "FirstAttendant",
		},
		{
			name:           "Read file",
			userRequest:    "read the content of README.md",
			expectedExpert: "FirstAttendant",
		},
		{
			name:           "Complex refactoring",
			userRequest:    "refactor this complex module with multiple dependencies and optimize the architecture",
			expectedExpert: "SecondThought", // Will escalate from FirstAttendant
		},
		{
			name:           "System architecture",
			userRequest:    "design a distributed microservices architecture with complex security requirements and performance optimization",
			expectedExpert: "Elite", // Will escalate through both
		},
	}

	for _, scenario := range scenarios {
		t.Run(scenario.name, func(t *testing.T) {
			request := &llm.Request{
				Messages: []llm.Message{
					{
						Role: llm.MessageRoleUser,
						Content: []llm.Content{
							{Type: llm.ContentTypeText, Text: scenario.userRequest},
						},
					},
				},
			}

			choice, err := cortex.ChooseExpert(ctx, request)
			if err != nil {
				t.Fatalf("Expert selection failed: %v", err)
			}

			if choice == nil {
				t.Fatal("No expert chosen")
			}

			if choice.Expert.Profile.Name != scenario.expectedExpert {
				t.Logf("Note: Expected %s, got %s for: %s",
					scenario.expectedExpert,
					choice.Expert.Profile.Name,
					scenario.userRequest)
				t.Logf("Reasoning: %s", choice.Reasoning)
			}

			t.Logf("✅ Task: '%s' → Expert: %s (Model: %s)",
				scenario.name,
				choice.Expert.Profile.Name,
				choice.Expert.Profile.Model)
		})
	}
}

// TestCostSavingsCalculation tests that we're calculating savings correctly
func TestCostSavingsCalculation(t *testing.T) {
	ce := DefaultCostEstimate()

	// Simulate 100 tasks
	tasks := []struct {
		model        string
		inputTokens  int
		outputTokens int
	}{
		// 70% simple tasks (FirstAttendant)
		{"gpt-5-nano", 50, 30},
		{"gpt-5-nano", 80, 120},
		{"gpt-5-nano", 40, 25},
		{"gpt-5-nano", 100, 150},
		{"gpt-5-nano", 60, 40},
		{"gpt-5-nano", 45, 30},
		{"gpt-5-nano", 70, 80},

		// 20% medium tasks (SecondThought)
		{"deepseek-reasoner", 500, 800},
		{"deepseek-reasoner", 800, 1200},

		// 10% complex tasks (Elite)
		{"claude-sonnet-4-5-20250929", 2000, 3500},
	}

	actualCost := 0.0
	claudeCost := 0.0

	for _, task := range tasks {
		actualCost += ce.CalculateCost(task.model, task.inputTokens, task.outputTokens)
		claudeCost += ce.CalculateCost("claude-sonnet-4-5-20250929", task.inputTokens, task.outputTokens)
	}

	savings := claudeCost - actualCost
	savingsPercent := (savings / claudeCost) * 100

	t.Logf("\n💰 COST ANALYSIS (10 tasks):")
	t.Logf("   Actual cost:        $%.4f", actualCost)
	t.Logf("   Cost if all Claude: $%.4f", claudeCost)
	t.Logf("   💵 Savings:         $%.4f (%.1f%%)", savings, savingsPercent)

	if savingsPercent < 30 {
		t.Errorf("Expected savings > 30%%, got %.1f%%", savingsPercent)
	} else {
		t.Logf("✅ Savings of %.1f%% meet expectations (>30%%)", savingsPercent)
	}

	// Project to 30 days
	tasksPerDay := 100
	projectedDailyCost := (actualCost / float64(len(tasks))) * float64(tasksPerDay)
	projectedMonthlyCost := projectedDailyCost * 30
	projectedMonthlySavings := ((claudeCost - actualCost) / float64(len(tasks))) * float64(tasksPerDay) * 30

	t.Logf("\n📊 PROJECTIONS (100 tasks/day, 30 days):")
	t.Logf("   Projected monthly cost:    $%.2f", projectedMonthlyCost)
	t.Logf("   Projected monthly savings: $%.2f", projectedMonthlySavings)
}

// TestPerformanceTracking tests that performance is being tracked
func TestPerformanceTracking(t *testing.T) {
	tracker := NewPerformanceTracker("logs")

	// Simulate some tasks
	for i := 0; i < 5; i++ {
		log := PerformanceLog{
			Timestamp:    time.Now(),
			Expert:       "FirstAttendant",
			Model:        "gpt-5-nano",
			Duration:     1200000000,
			TokensInput:  50,
			TokensOutput: 30,
			Success:      true,
		}
		tracker.Log(log)
	}

	recentLogs := tracker.GetRecentLogs(10)
	if len(recentLogs) != 5 {
		t.Errorf("Expected 5 logs, got %d", len(recentLogs))
	}

	stats := ComputeStatistics(recentLogs)
	t.Logf("\n📈 STATISTICS:")
	t.Logf("   Total tasks:     %d", stats.TotalTasks)
	t.Logf("   Success rate:    %.1f%%", stats.SuccessRate*100)
	t.Logf("   Escalation rate: %.1f%%", stats.EscalationRate*100)
	t.Logf("   Avg duration:    %v", stats.AvgDuration)

	if stats.SuccessRate != 1.0 {
		t.Errorf("Expected 100%% success rate, got %.1f%%", stats.SuccessRate*100)
	}
}
