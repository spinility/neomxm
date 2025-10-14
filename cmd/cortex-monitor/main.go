package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/spinility/sketch-neomxm/cortex"
)

func main() {
	logsDir := flag.String("logs", "cortex/logs", "Path to cortex logs directory")
	sinceDays := flag.Int("days", 1, "Show data from last N days")
	flag.Parse()

	since := time.Now().Add(-time.Duration(*sinceDays) * 24 * time.Hour)

	report, err := cortex.GenerateReport(*logsDir, since)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error generating report: %v\n", err)
		os.Exit(1)
	}

	report.PrintReport()
}
