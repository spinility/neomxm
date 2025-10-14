package cortex

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// PerformanceLog represents a single task execution log
type PerformanceLog struct {
	Timestamp       time.Time     `json:"timestamp"`
	Expert          string        `json:"expert"`
	Model           string        `json:"model"`
	TaskDescription string        `json:"task_description,omitempty"`
	Duration        time.Duration `json:"duration"`
	TokensInput     int           `json:"tokens_input"`
	TokensOutput    int           `json:"tokens_output"`
	Success         bool          `json:"success"`
	ErrorMessage    string        `json:"error_message,omitempty"`
	Escalated       bool          `json:"escalated,omitempty"`
	EscalatedTo     string        `json:"escalated_to,omitempty"`
}

// PerformanceTracker manages performance logging
type PerformanceTracker struct {
	logsDir string
	logs    []PerformanceLog
	mu      sync.Mutex
}

// NewPerformanceTracker creates a new performance tracker
func NewPerformanceTracker(logsDir string) *PerformanceTracker {
	return &PerformanceTracker{
		logsDir: logsDir,
		logs:    []PerformanceLog{},
	}
}

// Log adds a performance log entry
func (pt *PerformanceTracker) Log(log PerformanceLog) {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	pt.logs = append(pt.logs, log)
}

// Save persists the performance logs to disk
func (pt *PerformanceTracker) Save() error {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	if len(pt.logs) == 0 {
		return nil
	}

	// Ensure logs directory exists
	if err := os.MkdirAll(pt.logsDir, 0755); err != nil {
		return fmt.Errorf("failed to create logs directory: %w", err)
	}

	// Generate filename with timestamp
	filename := fmt.Sprintf("performance_%s.json", time.Now().Format("2006-01-02"))
	path := filepath.Join(pt.logsDir, filename)

	// Load existing logs if file exists
	existingLogs := []PerformanceLog{}
	if data, err := os.ReadFile(path); err == nil {
		_ = json.Unmarshal(data, &existingLogs)
	}

	// Append new logs
	allLogs := append(existingLogs, pt.logs...)

	// Marshal to JSON
	data, err := json.MarshalIndent(allLogs, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal logs: %w", err)
	}

	// Write to file
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write logs: %w", err)
	}

	// Clear in-memory logs after successful save
	pt.logs = []PerformanceLog{}

	return nil
}

// GetRecentLogs returns the most recent N logs
func (pt *PerformanceTracker) GetRecentLogs(n int) []PerformanceLog {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	if len(pt.logs) <= n {
		return pt.logs
	}
	return pt.logs[len(pt.logs)-n:]
}

// LoadTodaysLogs loads performance logs from today's file
func (pt *PerformanceTracker) LoadTodaysLogs() ([]PerformanceLog, error) {
	filename := fmt.Sprintf("performance_%s.json", time.Now().Format("2006-01-02"))
	path := filepath.Join(pt.logsDir, filename)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []PerformanceLog{}, nil
		}
		return nil, fmt.Errorf("failed to read logs: %w", err)
	}

	var logs []PerformanceLog
	if err := json.Unmarshal(data, &logs); err != nil {
		return nil, fmt.Errorf("failed to parse logs: %w", err)
	}

	return logs, nil
}

// Statistics computes basic statistics from logs
type Statistics struct {
	TotalTasks     int
	SuccessRate    float64
	AvgDuration    time.Duration
	TotalTokens    int
	ExpertUsage    map[string]int
	EscalationRate float64
}

// ComputeStatistics calculates statistics from the given logs
func ComputeStatistics(logs []PerformanceLog) Statistics {
	if len(logs) == 0 {
		return Statistics{}
	}

	stats := Statistics{
		TotalTasks:  len(logs),
		ExpertUsage: make(map[string]int),
	}

	successCount := 0
	escalationCount := 0
	totalDuration := time.Duration(0)
	totalTokens := 0

	for _, log := range logs {
		if log.Success {
			successCount++
		}
		if log.Escalated {
			escalationCount++
		}
		totalDuration += log.Duration
		totalTokens += log.TokensInput + log.TokensOutput
		stats.ExpertUsage[log.Expert]++
	}

	stats.SuccessRate = float64(successCount) / float64(len(logs))
	stats.EscalationRate = float64(escalationCount) / float64(len(logs))
	stats.AvgDuration = totalDuration / time.Duration(len(logs))
	stats.TotalTokens = totalTokens

	return stats
}
