package loop

import (
	"context"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"testing"
	"time"

	"tailscale.com/portlist"
)

// TestPortMonitor_NewPortMonitor tests the creation of a new PortMonitor.
func TestPortMonitor_NewPortMonitor(t *testing.T) {
	agent := createTestAgent(t)
	interval := 2 * time.Second

	pm := NewPortMonitor(agent, interval)

	if pm == nil {
		t.Fatal("NewPortMonitor returned nil")
	}

	if pm.agent != agent {
		t.Errorf("expected agent %v, got %v", agent, pm.agent)
	}

	if pm.interval != interval {
		t.Errorf("expected interval %v, got %v", interval, pm.interval)
	}

	if pm.running {
		t.Error("expected monitor to not be running initially")
	}

	if pm.poller == nil {
		t.Error("expected poller to be initialized")
	}

	if !pm.poller.IncludeLocalhost {
		t.Error("expected IncludeLocalhost to be true")
	}
}

// TestPortMonitor_DefaultInterval tests that a default interval is set when invalid.
func TestPortMonitor_DefaultInterval(t *testing.T) {
	agent := createTestAgent(t)

	pm := NewPortMonitor(agent, 0)
	if pm.interval != 5*time.Second {
		t.Errorf("expected default interval 5s, got %v", pm.interval)
	}

	pm2 := NewPortMonitor(agent, -1*time.Second)
	if pm2.interval != 5*time.Second {
		t.Errorf("expected default interval 5s, got %v", pm2.interval)
	}
}

// TestPortMonitor_StartStop tests starting and stopping the monitor.
func TestPortMonitor_StartStop(t *testing.T) {
	agent := createTestAgent(t)
	pm := NewPortMonitor(agent, 100*time.Millisecond)

	// Test starting
	ctx := context.Background()
	err := pm.Start(ctx)
	if err != nil {
		t.Fatalf("failed to start port monitor: %v", err)
	}

	if !pm.running {
		t.Error("expected monitor to be running after start")
	}

	// Test double start fails
	err = pm.Start(ctx)
	if err == nil {
		t.Error("expected error when starting already running monitor")
	}

	// Test stopping
	pm.Stop()
	if pm.running {
		t.Error("expected monitor to not be running after stop")
	}

	// Test double stop is safe
	pm.Stop() // should not panic
}

// TestPortMonitor_GetPorts tests getting the cached port list.
func TestPortMonitor_GetPorts(t *testing.T) {
	agent := createTestAgent(t)
	pm := NewPortMonitor(agent, 100*time.Millisecond)

	// Initially should be empty
	ports := pm.GetPorts()
	if len(ports) != 0 {
		t.Errorf("expected empty ports initially, got %d", len(ports))
	}

	// Start monitoring to populate ports
	ctx := context.Background()
	err := pm.Start(ctx)
	if err != nil {
		t.Fatalf("failed to start port monitor: %v", err)
	}
	defer pm.Stop()

	// Allow some time for initial scan
	time.Sleep(200 * time.Millisecond)

	// Should have some ports now (at least system ports)
	ports = pm.GetPorts()
	// We can't guarantee specific ports, but there should be at least some TCP ports
	// on most systems (like SSH, etc.)
	t.Logf("Found %d TCP ports", len(ports))

	// Verify all returned ports are TCP
	for _, port := range ports {
		if port.Proto != "tcp" {
			t.Errorf("expected TCP port, got %s", port.Proto)
		}
	}
}

// TestPortMonitor_FilterTCPPorts tests the TCP port filtering.
func TestPortMonitor_FilterTCPPorts(t *testing.T) {
	ports := []portlist.Port{
		{Proto: "tcp", Port: 80},
		{Proto: "udp", Port: 53},
		{Proto: "tcp", Port: 443},
		{Proto: "udp", Port: 123},
	}

	tcpPorts := filterTCPPorts(ports)

	if len(tcpPorts) != 2 {
		t.Errorf("expected 2 TCP ports, got %d", len(tcpPorts))
	}

	for _, port := range tcpPorts {
		if port.Proto != "tcp" {
			t.Errorf("expected TCP port, got %s", port.Proto)
		}
	}
}

// TestPortMonitor_SortPorts tests the port sorting.
func TestPortMonitor_SortPorts(t *testing.T) {
	ports := []portlist.Port{
		{Proto: "tcp", Port: 443},
		{Proto: "tcp", Port: 80},
		{Proto: "tcp", Port: 8080},
		{Proto: "tcp", Port: 22},
	}

	sortPorts(ports)

	expected := []uint16{22, 80, 443, 8080}
	for i, port := range ports {
		if port.Port != expected[i] {
			t.Errorf("expected port %d at index %d, got %d", expected[i], i, port.Port)
		}
	}
}

// TestPortMonitor_FindAddedPorts tests finding added ports.
func TestPortMonitor_FindAddedPorts(t *testing.T) {
	previous := []portlist.Port{
		{Proto: "tcp", Port: 80},
		{Proto: "tcp", Port: 443},
	}

	current := []portlist.Port{
		{Proto: "tcp", Port: 80},
		{Proto: "tcp", Port: 443},
		{Proto: "tcp", Port: 8080},
		{Proto: "tcp", Port: 22},
	}

	added := findAddedPorts(previous, current)

	if len(added) != 2 {
		t.Errorf("expected 2 added ports, got %d", len(added))
	}

	addedPorts := make(map[uint16]bool)
	for _, port := range added {
		addedPorts[port.Port] = true
	}

	if !addedPorts[8080] || !addedPorts[22] {
		t.Errorf("expected ports 8080 and 22 to be added, got %v", added)
	}
}

// TestPortMonitor_FindRemovedPorts tests finding removed ports.
func TestPortMonitor_FindRemovedPorts(t *testing.T) {
	previous := []portlist.Port{
		{Proto: "tcp", Port: 80},
		{Proto: "tcp", Port: 443},
		{Proto: "tcp", Port: 8080},
		{Proto: "tcp", Port: 22},
	}

	current := []portlist.Port{
		{Proto: "tcp", Port: 80},
		{Proto: "tcp", Port: 443},
	}

	removed := findRemovedPorts(previous, current)

	if len(removed) != 2 {
		t.Errorf("expected 2 removed ports, got %d", len(removed))
	}

	removedPorts := make(map[uint16]bool)
	for _, port := range removed {
		removedPorts[port.Port] = true
	}

	if !removedPorts[8080] || !removedPorts[22] {
		t.Errorf("expected ports 8080 and 22 to be removed, got %v", removed)
	}
}

// TestPortMonitor_ShouldIgnoreProcess tests the shouldIgnoreProcess function.
func TestPortMonitor_ShouldIgnoreProcess(t *testing.T) {
	if runtime.GOOS != "linux" {
		// The implementation of shouldIgnoreProcess is specific to Linux (it uses /proc).
		// On macOS, ignoring SKETCH_IGNORE_PORTS simply won't work, because macOS doesn't expose other processes' environment variables.
		// This is OK (enough) because our primary operating environment is a Linux container.
		t.Skip("skipping test on non-Linux OS")
	}

	agent := createTestAgent(t)
	pm := NewPortMonitor(agent, 100*time.Millisecond)

	// Test with current process
	currentPid := os.Getpid()
	// The current process might have SKETCH_IGNORE_PORTS=1 in its environment,
	// so we check if it should be ignored based on its actual environment
	sketchIgnore := os.Getenv("SKETCH_IGNORE_PORTS") == "1"
	if pm.shouldIgnoreProcess(currentPid) != sketchIgnore {
		t.Errorf("current process ignore status mismatch: expected %v, got %v", sketchIgnore, pm.shouldIgnoreProcess(currentPid))
	}

	// Test with invalid PID
	if pm.shouldIgnoreProcess(0) {
		t.Errorf("invalid PID should not be ignored")
	}
	if pm.shouldIgnoreProcess(-1) {
		t.Errorf("negative PID should not be ignored")
	}

	// Test with a process that has SKETCH_IGNORE_PORTS=1
	cmd := exec.Command("sleep", "5")
	cmd.Env = append(os.Environ(), "SKETCH_IGNORE_PORTS=1")
	err := cmd.Start()
	if err != nil {
		t.Fatalf("failed to start test process: %v", err)
	}
	defer cmd.Process.Kill()

	// Allow a moment for the process to start
	time.Sleep(100 * time.Millisecond)

	if !pm.shouldIgnoreProcess(cmd.Process.Pid) {
		t.Errorf("process with SKETCH_IGNORE_PORTS=1 should be ignored")
	}
}

// TestPortMonitor_BatchNotification tests that port changes are sent as a single batch notification.
func TestPortMonitor_BatchNotification(t *testing.T) {
	agent := createTestAgent(t)
	pm := NewPortMonitor(agent, 100*time.Millisecond)

	// Test with multiple added and removed ports
	addedPorts := []portlist.Port{
		{Proto: "tcp", Port: 8080, Process: "test-server", Pid: 1234},
		{Proto: "tcp", Port: 9000, Process: "another-server", Pid: 5678},
	}

	removedPorts := []portlist.Port{
		{Proto: "tcp", Port: 3000, Process: "old-server", Pid: 9999},
	}

	// Capture the message count before sending notification
	initialMessageCount := len(agent.history)

	// Send batch notification
	pm.sendBatchPortNotification(addedPorts, removedPorts)

	// Should have exactly one new message
	if len(agent.history) != initialMessageCount+1 {
		t.Errorf("expected 1 new message, got %d", len(agent.history)-initialMessageCount)
	}

	// Check the content of the new message
	if len(agent.history) > 0 {
		msg := agent.history[len(agent.history)-1]
		if msg.Type != PortMessageType {
			t.Errorf("expected PortMessageType, got %v", msg.Type)
		}
		if !msg.HideOutput {
			t.Error("expected HideOutput to be true")
		}
		// Check that the message contains information about both opened and closed ports
		if !strings.Contains(msg.Content, "Ports opened:") {
			t.Errorf("expected message to contain 'Ports opened:', got: %s", msg.Content)
		}
		if !strings.Contains(msg.Content, "Port closed:") {
			t.Errorf("expected message to contain 'Port closed:', got: %s", msg.Content)
		}
		t.Logf("Batch notification content: %s", msg.Content)
	}
}

// TestPortMonitor_BatchNotificationFiltering tests that low ports and ignored processes are filtered out.
func TestPortMonitor_BatchNotificationFiltering(t *testing.T) {
	agent := createTestAgent(t)
	pm := NewPortMonitor(agent, 100*time.Millisecond)

	// Test with ports that should be filtered out
	addedPorts := []portlist.Port{
		{Proto: "tcp", Port: 80, Process: "system", Pid: 1},           // Should be filtered (pid 1)
		{Proto: "tcp", Port: 443, Process: "system", Pid: 0},          // Should be filtered (low port)
		{Proto: "tcp", Port: 8080, Process: "user-server", Pid: 1234}, // Should not be filtered
	}

	// Capture the message count before sending notification
	initialMessageCount := len(agent.history)

	// Send batch notification
	pm.sendBatchPortNotification(addedPorts, []portlist.Port{})

	// Should have exactly one new message with only the unfiltered port
	if len(agent.history) != initialMessageCount+1 {
		t.Errorf("expected 1 new message, got %d", len(agent.history)-initialMessageCount)
	}

	// Check the content of the new message
	if len(agent.history) > 0 {
		msg := agent.history[len(agent.history)-1]
		if !strings.Contains(msg.Content, "8080") {
			t.Errorf("expected message to contain port 8080, got: %s", msg.Content)
		}
		if strings.Contains(msg.Content, "80") && !strings.Contains(msg.Content, "8080") {
			t.Errorf("message should not contain filtered port 80, got: %s", msg.Content)
		}
		if strings.Contains(msg.Content, "443") {
			t.Errorf("message should not contain filtered port 443, got: %s", msg.Content)
		}
	}
}

// TestPortMonitor_BatchNotificationEmpty tests that no notification is sent when all ports are filtered out.
func TestPortMonitor_BatchNotificationEmpty(t *testing.T) {
	agent := createTestAgent(t)
	pm := NewPortMonitor(agent, 100*time.Millisecond)

	// Test with ports that should all be filtered out
	addedPorts := []portlist.Port{
		{Proto: "tcp", Port: 80, Process: "system", Pid: 1},  // Filtered (pid 1)
		{Proto: "tcp", Port: 443, Process: "system", Pid: 0}, // Filtered (low port)
	}

	// Capture the message count before sending notification
	initialMessageCount := len(agent.history)

	// Send batch notification
	pm.sendBatchPortNotification(addedPorts, []portlist.Port{})

	// Should not have any new messages when all ports are filtered
	if len(agent.history) != initialMessageCount {
		t.Errorf("expected no new messages when all ports are filtered, but got %d new messages", len(agent.history)-initialMessageCount)
	}
}

// createTestAgent creates a minimal test agent for testing.
func createTestAgent(t *testing.T) *Agent {
	// Create a minimal agent for testing
	// We need to initialize the required fields for the PortMonitor to work
	agent := &Agent{
		subscribers: make([]chan *AgentMessage, 0),
		history:     make([]AgentMessage, 0),
	}
	return agent
}
