package cortex

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// CostEstimate holds pricing information for different models
type CostEstimate struct {
	ModelPricing map[string]ModelPricing
}

type ModelPricing struct {
	InputCostPerMToken  float64 // Cost per million input tokens
	OutputCostPerMToken float64 // Cost per million output tokens
}

// DefaultCostEstimate returns default pricing for models
func DefaultCostEstimate() *CostEstimate {
	return &CostEstimate{
		ModelPricing: map[string]ModelPricing{
			"gpt-5-nano": {
				InputCostPerMToken:  0.10, // $0.10 per 1M tokens (estimated)
				OutputCostPerMToken: 0.30,
			},
			"deepseek-chat": {
				InputCostPerMToken:  0.14, // DeepSeek-V3 pricing
				OutputCostPerMToken: 0.28,
			},
			"claude-sonnet-4-5-20250929": {
				InputCostPerMToken:  3.00, // Claude Sonnet pricing
				OutputCostPerMToken: 15.00,
			},
		},
	}
}

// CalculateCost calculates the cost of a task
func (ce *CostEstimate) CalculateCost(model string, inputTokens, outputTokens int) float64 {
	pricing, exists := ce.ModelPricing[model]
	if !exists {
		// Default to Claude pricing if unknown
		pricing = ce.ModelPricing["claude-sonnet-4-5-20250929"]
	}

	inputCost := float64(inputTokens) / 1_000_000 * pricing.InputCostPerMToken
	outputCost := float64(outputTokens) / 1_000_000 * pricing.OutputCostPerMToken

	return inputCost + outputCost
}

// MonitoringReport contains monitoring statistics
type MonitoringReport struct {
	Period            string
	TotalTasks        int
	TasksByExpert     map[string]int
	TotalCost         float64
	CostByExpert      map[string]float64
	EstimatedSavings  float64 // Compared to using Claude for everything
	SavingsPercentage float64
	AverageDuration   time.Duration
	SuccessRate       float64
	EscalationRate    float64
}

// GenerateReport generates a monitoring report from performance logs
func GenerateReport(logsDir string, since time.Time) (*MonitoringReport, error) {
	costEstimate := DefaultCostEstimate()

	// Load all performance logs since the given time
	var allLogs []PerformanceLog

	err := filepath.WalkDir(logsDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() || filepath.Ext(path) != ".json" {
			return nil
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		var logs []PerformanceLog
		if err := json.Unmarshal(data, &logs); err != nil {
			return err
		}

		// Filter by time
		for _, log := range logs {
			if log.Timestamp.After(since) {
				allLogs = append(allLogs, log)
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	if len(allLogs) == 0 {
		return &MonitoringReport{Period: "no data"}, nil
	}

	// Calculate statistics
	report := &MonitoringReport{
		Period:        fmt.Sprintf("%s to now", since.Format("2006-01-02 15:04")),
		TotalTasks:    len(allLogs),
		TasksByExpert: make(map[string]int),
		CostByExpert:  make(map[string]float64),
	}

	successCount := 0
	escalationCount := 0
	totalDuration := time.Duration(0)
	totalCostIfClaude := 0.0

	for _, log := range allLogs {
		// Count by expert
		report.TasksByExpert[log.Expert]++

		// Calculate actual cost
		cost := costEstimate.CalculateCost(log.Model, log.TokensInput, log.TokensOutput)
		report.TotalCost += cost
		report.CostByExpert[log.Expert] += cost

		// Calculate what it would cost with Claude
		claudeCost := costEstimate.CalculateCost(
			"claude-sonnet-4-5-20250929",
			log.TokensInput,
			log.TokensOutput,
		)
		totalCostIfClaude += claudeCost

		// Other stats
		if log.Success {
			successCount++
		}
		if log.Escalated {
			escalationCount++
		}
		totalDuration += log.Duration
	}

	report.EstimatedSavings = totalCostIfClaude - report.TotalCost
	if totalCostIfClaude > 0 {
		report.SavingsPercentage = (report.EstimatedSavings / totalCostIfClaude) * 100
	}
	report.SuccessRate = float64(successCount) / float64(len(allLogs))
	report.EscalationRate = float64(escalationCount) / float64(len(allLogs))
	report.AverageDuration = totalDuration / time.Duration(len(allLogs))

	return report, nil
}

// PrintReport prints a formatted monitoring report
func (r *MonitoringReport) PrintReport() {
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("📊 CORTEX MONITORING REPORT")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("Period: %s\n", r.Period)
	fmt.Printf("Total Tasks: %d\n\n", r.TotalTasks)

	fmt.Println("💰 COST ANALYSIS:")
	fmt.Printf("  Actual Cost:        $%.4f\n", r.TotalCost)
	fmt.Printf("  Cost if all Claude: $%.4f\n", r.TotalCost+r.EstimatedSavings)
	fmt.Printf("  💵 Savings:         $%.4f (%.1f%%)\n\n", r.EstimatedSavings, r.SavingsPercentage)

	fmt.Println("🎯 EXPERT USAGE:")
	// Sort experts by usage
	type expertStat struct {
		name  string
		count int
		cost  float64
	}
	var experts []expertStat
	for name, count := range r.TasksByExpert {
		experts = append(experts, expertStat{
			name:  name,
			count: count,
			cost:  r.CostByExpert[name],
		})
	}
	sort.Slice(experts, func(i, j int) bool {
		return experts[i].count > experts[j].count
	})

	for _, expert := range experts {
		percentage := float64(expert.count) / float64(r.TotalTasks) * 100
		fmt.Printf("  %-20s %4d tasks (%.1f%%) - $%.4f\n",
			expert.name, expert.count, percentage, expert.cost)
	}

	fmt.Println("\n📈 PERFORMANCE:")
	fmt.Printf("  Success Rate:    %.1f%%\n", r.SuccessRate*100)
	fmt.Printf("  Escalation Rate: %.1f%%\n", r.EscalationRate*100)
	fmt.Printf("  Avg Duration:    %v\n", r.AverageDuration.Round(time.Millisecond))

	if r.TotalTasks > 0 {
		fmt.Println("\n💡 PROJECTIONS (30 days):")
		// Very rough projection based on current data
		daysOfData := 1.0 // Assume 1 day for now
		if r.TotalTasks > 100 {
			daysOfData = 7.0
		}
		projectedMonthlyCost := (r.TotalCost / daysOfData) * 30
		projectedMonthlySavings := (r.EstimatedSavings / daysOfData) * 30
		fmt.Printf("  Projected Monthly Cost:    $%.2f\n", projectedMonthlyCost)
		fmt.Printf("  Projected Monthly Savings: $%.2f\n", projectedMonthlySavings)
	}

	fmt.Println(strings.Repeat("=", 60) + "\n")
}
