package loop

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"tailscale.com/portlist"
)

// PortMonitor monitors open/listening TCP ports and sends notifications
// to an Agent when ports are detected or removed.
type PortMonitor struct {
	mu       sync.RWMutex
	ports    []portlist.Port // cached list of current ports
	poller   *portlist.Poller
	agent    *Agent
	ctx      context.Context
	cancel   context.CancelFunc
	interval time.Duration
	running  bool
	wg       sync.WaitGroup
}

// NewPortMonitor creates a new PortMonitor instance.
func NewPortMonitor(agent *Agent, interval time.Duration) *PortMonitor {
	if interval <= 0 {
		interval = 5 * time.Second // default polling interval
	}

	ctx, cancel := context.WithCancel(context.Background())
	poller := &portlist.Poller{
		IncludeLocalhost: true, // include localhost-bound services
	}

	return &PortMonitor{
		poller:   poller,
		agent:    agent,
		ctx:      ctx,
		cancel:   cancel,
		interval: interval,
	}
}

// Start begins monitoring ports in a background goroutine.
func (pm *PortMonitor) Start(ctx context.Context) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if pm.running {
		return fmt.Errorf("port monitor is already running")
	}

	// Update the internal context to use the provided context
	pm.cancel() // Cancel the old context
	pm.ctx, pm.cancel = context.WithCancel(ctx)

	pm.running = true
	pm.wg.Add(1)

	// Do initial port scan
	if err := pm.initialScan(); err != nil {
		pm.running = false
		pm.wg.Done()
		return fmt.Errorf("initial port scan failed: %w", err)
	}

	go pm.monitor()
	return nil
}

// Stop stops the port monitor.
func (pm *PortMonitor) Stop() {
	pm.mu.Lock()
	if !pm.running {
		pm.mu.Unlock()
		return
	}

	pm.running = false
	pm.cancel()
	pm.mu.Unlock()
	pm.wg.Wait()
	pm.poller.Close()
}

// GetPorts returns the cached list of open ports.
func (pm *PortMonitor) GetPorts() []portlist.Port {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	// Return a copy to prevent data races
	ports := make([]portlist.Port, len(pm.ports))
	copy(ports, pm.ports)
	return ports
}

// initialScan performs the initial port scan without sending notifications.
func (pm *PortMonitor) initialScan() error {
	ports, _, err := pm.poller.Poll()
	if err != nil {
		return err
	}

	// Filter for TCP ports only
	pm.ports = filterTCPPorts(ports)
	sortPorts(pm.ports)

	return nil
}

// monitor runs the port monitoring loop.
func (pm *PortMonitor) monitor() {
	defer pm.wg.Done()

	for {
		select {
		case <-pm.ctx.Done():
			return
		default:
			// Check ports
			if err := pm.checkPorts(); err != nil {
				slog.WarnContext(pm.ctx, "port monitoring error", "error", err)
			}

			// Wait for the interval or until context is cancelled
			select {
			case <-pm.ctx.Done():
				return
			case <-time.After(pm.interval):
				// Continue to next iteration
			}
		}
	}
}

// checkPorts polls for current ports and sends notifications for changes.
func (pm *PortMonitor) checkPorts() error {
	ports, changed, err := pm.poller.Poll()
	if err != nil {
		return err
	}

	if !changed {
		return nil
	}

	// Filter for TCP ports only
	currentTCPPorts := filterTCPPorts(ports)
	sortPorts(currentTCPPorts)

	pm.mu.Lock()
	previousPorts := pm.ports
	pm.ports = currentTCPPorts
	pm.mu.Unlock()

	// Find added and removed ports
	addedPorts := findAddedPorts(previousPorts, currentTCPPorts)
	removedPorts := findRemovedPorts(previousPorts, currentTCPPorts)

	// Send batch notifications for changes
	pm.sendBatchPortNotification(addedPorts, removedPorts)

	return nil
}

// sendBatchPortNotification sends a single notification with all port changes to the agent.
func (pm *PortMonitor) sendBatchPortNotification(addedPorts, removedPorts []portlist.Port) {
	if pm.agent == nil {
		return
	}

	// Filter ports to exclude low ports, sketch's ports, and ignored processes
	filteredAdded := pm.filterPorts(addedPorts)
	filteredRemoved := pm.filterPorts(removedPorts)

	// If no changes after filtering, don't send a notification
	if len(filteredAdded) == 0 && len(filteredRemoved) == 0 {
		return
	}

	var contentParts []string

	// Add opened ports to the message
	if len(filteredAdded) > 0 {
		var openedPorts []string
		for _, port := range filteredAdded {
			portDesc := fmt.Sprintf("%s:%d", port.Proto, port.Port)
			if port.Process != "" {
				portDesc += fmt.Sprintf(" (%s)", port.Process)
			}
			if port.Pid != 0 {
				portDesc += fmt.Sprintf(" [pid:%d]", port.Pid)
			}
			openedPorts = append(openedPorts, portDesc)
		}
		if len(openedPorts) == 1 {
			contentParts = append(contentParts, fmt.Sprintf("Port opened: %s", openedPorts[0]))
		} else {
			contentParts = append(contentParts, fmt.Sprintf("Ports opened: %s", strings.Join(openedPorts, ", ")))
		}
	}

	// Add closed ports to the message
	if len(filteredRemoved) > 0 {
		var closedPorts []string
		for _, port := range filteredRemoved {
			portDesc := fmt.Sprintf("%s:%d", port.Proto, port.Port)
			if port.Process != "" {
				portDesc += fmt.Sprintf(" (%s)", port.Process)
			}
			if port.Pid != 0 {
				portDesc += fmt.Sprintf(" [pid:%d]", port.Pid)
			}
			closedPorts = append(closedPorts, portDesc)
		}
		if len(closedPorts) == 1 {
			contentParts = append(contentParts, fmt.Sprintf("Port closed: %s", closedPorts[0]))
		} else {
			contentParts = append(contentParts, fmt.Sprintf("Ports closed: %s", strings.Join(closedPorts, ", ")))
		}
	}

	content := strings.Join(contentParts, "; ")

	msg := AgentMessage{
		Type:       PortMessageType,
		Content:    content,
		HideOutput: true,
	}

	pm.agent.pushToOutbox(pm.ctx, msg)
}

// filterPorts filters out ports that should be ignored.
func (pm *PortMonitor) filterPorts(ports []portlist.Port) []portlist.Port {
	var filtered []portlist.Port
	for _, port := range ports {
		// Skip low ports and sketch's ports
		if port.Port < 1024 || port.Pid == 1 {
			continue
		}

		// Skip processes with SKETCH_IGNORE_PORTS environment variable
		if pm.shouldIgnoreProcess(port.Pid) {
			continue
		}

		filtered = append(filtered, port)
	}
	return filtered
}

// filterTCPPorts filters the port list to include only TCP ports.
func filterTCPPorts(ports []portlist.Port) []portlist.Port {
	var tcpPorts []portlist.Port
	for _, port := range ports {
		if port.Proto == "tcp" {
			tcpPorts = append(tcpPorts, port)
		}
	}
	return tcpPorts
}

// sortPorts sorts ports by port number for consistent comparisons.
func sortPorts(ports []portlist.Port) {
	sort.Slice(ports, func(i, j int) bool {
		return ports[i].Port < ports[j].Port
	})
}

// findAddedPorts finds ports that are in current but not in previous.
func findAddedPorts(previous, current []portlist.Port) []portlist.Port {
	prevSet := make(map[uint16]bool)
	for _, port := range previous {
		prevSet[port.Port] = true
	}

	var added []portlist.Port
	for _, port := range current {
		if !prevSet[port.Port] {
			added = append(added, port)
		}
	}
	return added
}

// findRemovedPorts finds ports that are in previous but not in current.
func findRemovedPorts(previous, current []portlist.Port) []portlist.Port {
	currentSet := make(map[uint16]bool)
	for _, port := range current {
		currentSet[port.Port] = true
	}

	var removed []portlist.Port
	for _, port := range previous {
		if !currentSet[port.Port] {
			removed = append(removed, port)
		}
	}
	return removed
}

// shouldIgnoreProcess checks if a process should be ignored based on its environment variables.
func (pm *PortMonitor) shouldIgnoreProcess(pid int) bool {
	if pid <= 0 {
		return false
	}

	// Read the process environment from /proc/[pid]/environ
	envFile := fmt.Sprintf("/proc/%d/environ", pid)
	envData, err := os.ReadFile(envFile)
	if err != nil {
		// If we can't read the environment, don't ignore the process
		return false
	}

	// Parse the environment variables (null-separated)
	envVars := strings.Split(string(envData), "\x00")
	for _, envVar := range envVars {
		if envVar == "SKETCH_IGNORE_PORTS=1" {
			return true
		}
	}

	return false
}
