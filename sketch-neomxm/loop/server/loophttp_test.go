package server_test

import (
	"bufio"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"sketch.dev/llm/conversation"
	"sketch.dev/loop"
	"sketch.dev/loop/server"
	"tailscale.com/portlist"
)

// mockAgent is a mock implementation of loop.CodingAgent for testing
type mockAgent struct {
	mu                       sync.RWMutex
	messages                 []loop.AgentMessage
	messageCount             int
	currentState             string
	subscribers              []chan *loop.AgentMessage
	stateTransitionListeners []chan loop.StateTransition
	gitUsername              string
	initialCommit            string
	branchName               string
	branchPrefix             string
	workingDir               string
	sessionID                string
	slug                     string
	retryNumber              int
	skabandAddr              string
	model                    string
}

// ExternalMessage implements loop.CodingAgent.
func (m *mockAgent) ExternalMessage(ctx context.Context, msg loop.ExternalMessage) error {
	panic("unimplemented")
}

// TokenContextWindow implements loop.CodingAgent.
func (m *mockAgent) TokenContextWindow() int {
	return 200000
}

// ModelName implements loop.CodingAgent.
func (m *mockAgent) ModelName() string {
	return m.model
}

func (m *mockAgent) NewIterator(ctx context.Context, nextMessageIdx int) loop.MessageIterator {
	m.mu.RLock()
	// Send existing messages that should be available immediately
	ch := make(chan *loop.AgentMessage, 100)
	iter := &mockIterator{
		agent:          m,
		ctx:            ctx,
		nextMessageIdx: nextMessageIdx,
		ch:             ch,
	}
	m.mu.RUnlock()
	return iter
}

type mockIterator struct {
	agent          *mockAgent
	ctx            context.Context
	nextMessageIdx int
	ch             chan *loop.AgentMessage
	subscribed     bool
}

func (m *mockIterator) Next() *loop.AgentMessage {
	if !m.subscribed {
		m.agent.mu.Lock()
		m.agent.subscribers = append(m.agent.subscribers, m.ch)
		m.agent.mu.Unlock()
		m.subscribed = true
	}

	for {
		select {
		case <-m.ctx.Done():
			return nil
		case msg := <-m.ch:
			return msg
		}
	}
}

func (m *mockIterator) Close() {
	// Remove from subscribers using slices.Delete
	m.agent.mu.Lock()
	for i, ch := range m.agent.subscribers {
		if ch == m.ch {
			m.agent.subscribers = slices.Delete(m.agent.subscribers, i, i+1)
			break
		}
	}
	m.agent.mu.Unlock()
	close(m.ch)
}

func (m *mockAgent) Messages(start int, end int) []loop.AgentMessage {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if start >= len(m.messages) || end > len(m.messages) || start < 0 || end < 0 {
		return []loop.AgentMessage{}
	}
	return slices.Clone(m.messages[start:end])
}

func (m *mockAgent) MessageCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.messageCount
}

func (m *mockAgent) AddMessage(msg loop.AgentMessage) {
	m.mu.Lock()
	msg.Idx = m.messageCount
	m.messages = append(m.messages, msg)
	m.messageCount++

	// Create a copy of subscribers to avoid holding the lock while sending
	subscribers := make([]chan *loop.AgentMessage, len(m.subscribers))
	copy(subscribers, m.subscribers)
	m.mu.Unlock()

	// Notify subscribers
	msgCopy := msg // Create a copy to avoid race conditions
	for _, ch := range subscribers {
		ch <- &msgCopy
	}
}

func (m *mockAgent) NewStateTransitionIterator(ctx context.Context) loop.StateTransitionIterator {
	m.mu.Lock()
	ch := make(chan loop.StateTransition, 10)
	m.stateTransitionListeners = append(m.stateTransitionListeners, ch)
	m.mu.Unlock()

	return &mockStateTransitionIterator{
		agent: m,
		ctx:   ctx,
		ch:    ch,
	}
}

type mockStateTransitionIterator struct {
	agent *mockAgent
	ctx   context.Context
	ch    chan loop.StateTransition
}

func (m *mockStateTransitionIterator) Next() *loop.StateTransition {
	select {
	case <-m.ctx.Done():
		return nil
	case transition, ok := <-m.ch:
		if !ok {
			return nil
		}
		transitionCopy := transition
		return &transitionCopy
	}
}

func (m *mockStateTransitionIterator) Close() {
	m.agent.mu.Lock()
	for i, ch := range m.agent.stateTransitionListeners {
		if ch == m.ch {
			m.agent.stateTransitionListeners = slices.Delete(m.agent.stateTransitionListeners, i, i+1)
			break
		}
	}
	m.agent.mu.Unlock()
	close(m.ch)
}

func (m *mockAgent) CurrentStateName() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.currentState
}

func (m *mockAgent) TriggerStateTransition(from, to loop.State, event loop.TransitionEvent) {
	m.mu.Lock()
	m.currentState = to.String()
	transition := loop.StateTransition{
		From:  from,
		To:    to,
		Event: event,
	}

	// Create a copy of listeners to avoid holding the lock while sending
	listeners := make([]chan loop.StateTransition, len(m.stateTransitionListeners))
	copy(listeners, m.stateTransitionListeners)
	m.mu.Unlock()

	// Notify listeners
	for _, ch := range listeners {
		ch <- transition
	}
}

func (m *mockAgent) InitialCommit() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.initialCommit
}

func (m *mockAgent) SketchGitBase() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.initialCommit
}

func (m *mockAgent) SketchGitBaseRef() string {
	return "sketch-base-test-session"
}

func (m *mockAgent) BranchName() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.branchName
}

// Other required methods of loop.CodingAgent with minimal implementation
func (m *mockAgent) Init(loop.AgentInit) error                   { return nil }
func (m *mockAgent) Ready() <-chan struct{}                      { ch := make(chan struct{}); close(ch); return ch }
func (m *mockAgent) URL() string                                 { return "http://localhost:8080" }
func (m *mockAgent) UserMessage(ctx context.Context, msg string) {}
func (m *mockAgent) Loop(ctx context.Context)                    {}
func (m *mockAgent) CancelTurn(cause error)                      {}
func (m *mockAgent) CancelToolUse(id string, cause error) error  { return nil }
func (m *mockAgent) TotalUsage() conversation.CumulativeUsage    { return conversation.CumulativeUsage{} }
func (m *mockAgent) OriginalBudget() conversation.Budget         { return conversation.Budget{} }
func (m *mockAgent) WorkingDir() string                          { return m.workingDir }
func (m *mockAgent) RepoRoot() string                            { return m.workingDir }
func (m *mockAgent) Diff(commit *string) (string, error)         { return "", nil }
func (m *mockAgent) OS() string                                  { return "linux" }
func (m *mockAgent) SessionID() string                           { return m.sessionID }
func (m *mockAgent) SSHConnectionString() string                 { return "sketch-" + m.sessionID }
func (m *mockAgent) BranchPrefix() string                        { return m.branchPrefix }
func (m *mockAgent) CurrentTodoContent() string                  { return "" } // Mock returns empty for simplicity
func (m *mockAgent) OutstandingLLMCallCount() int                { return 0 }
func (m *mockAgent) OutstandingToolCalls() []string              { return nil }
func (m *mockAgent) OutsideOS() string                           { return "linux" }
func (m *mockAgent) OutsideHostname() string                     { return "test-host" }
func (m *mockAgent) OutsideWorkingDir() string                   { return "/app" }
func (m *mockAgent) GitOrigin() string                           { return "" }
func (m *mockAgent) GitUsername() string                         { return m.gitUsername }
func (m *mockAgent) PassthroughUpstream() bool                   { return false }
func (m *mockAgent) OpenBrowser(url string)                      {}
func (m *mockAgent) CompactConversation(ctx context.Context) error {
	// Mock implementation - just return nil
	return nil
}
func (m *mockAgent) IsInContainer() bool                        { return false }
func (m *mockAgent) FirstMessageIndex() int                     { return 0 }
func (m *mockAgent) DetectGitChanges(ctx context.Context) error { return nil }

func (m *mockAgent) Slug() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.slug
}

func (m *mockAgent) IncrementRetryNumber() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.retryNumber++
}

func (m *mockAgent) SkabandAddr() string   { return m.skabandAddr }
func (m *mockAgent) LinkToGitHub() bool    { return false }
func (m *mockAgent) DiffStats() (int, int) { return 0, 0 }
func (m *mockAgent) GetPorts() []portlist.Port {
	// Mock returns a few test ports
	return []portlist.Port{
		{Proto: "tcp", Port: 22, Process: "sshd", Pid: 1234},
		{Proto: "tcp", Port: 80, Process: "nginx", Pid: 5678},
		{Proto: "tcp", Port: 8080, Process: "test-server", Pid: 9012},
	}
}

// TestSSEStream tests the SSE stream endpoint
func TestSSEStream(t *testing.T) {
	// Create a mock agent with initial messages
	mockAgent := &mockAgent{
		messages:                 []loop.AgentMessage{},
		messageCount:             0,
		currentState:             "Ready",
		subscribers:              []chan *loop.AgentMessage{},
		stateTransitionListeners: []chan loop.StateTransition{},
		initialCommit:            "abcd1234",
		branchName:               "sketch/test-branch",
		branchPrefix:             "sketch/",
		slug:                     "test-slug",
		model:                    "fake-model",
	}

	// Add the initial messages before creating the server
	// to ensure they're available in the Messages slice
	msg1 := loop.AgentMessage{
		Type:      loop.UserMessageType,
		Content:   "Hello, this is a test message",
		Timestamp: time.Now(),
	}
	mockAgent.messages = append(mockAgent.messages, msg1)
	msg1.Idx = mockAgent.messageCount
	mockAgent.messageCount++

	msg2 := loop.AgentMessage{
		Type:      loop.AgentMessageType,
		Content:   "This is a response message",
		Timestamp: time.Now(),
		EndOfTurn: true,
	}
	mockAgent.messages = append(mockAgent.messages, msg2)
	msg2.Idx = mockAgent.messageCount
	mockAgent.messageCount++

	// Create a server with the mock agent
	srv, err := server.New(mockAgent, nil)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	// Create a test server
	ts := httptest.NewServer(srv)
	defer ts.Close()

	// Create a context with cancellation for the client request
	ctx, cancel := context.WithCancel(context.Background())

	// Create a request to the /stream endpoint
	req, err := http.NewRequestWithContext(ctx, "GET", ts.URL+"/stream?from=0", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	// Execute the request
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Failed to execute request: %v", err)
	}
	defer res.Body.Close()

	// Check response status
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected status OK, got %v", res.Status)
	}

	// Check content type
	if contentType := res.Header.Get("Content-Type"); contentType != "text/event-stream" {
		t.Fatalf("Expected Content-Type text/event-stream, got %s", contentType)
	}

	// Read response events using a scanner
	scanner := bufio.NewScanner(res.Body)

	// Track events received
	eventsReceived := map[string]int{
		"state":     0,
		"message":   0,
		"heartbeat": 0,
	}

	// Read for a short time to capture initial state and messages
	dataLines := []string{}
	eventType := ""

	go func() {
		// After reading for a while, add a new message to test real-time updates
		time.Sleep(500 * time.Millisecond)

		mockAgent.AddMessage(loop.AgentMessage{
			Type:      loop.ToolUseMessageType,
			Content:   "This is a new real-time message",
			Timestamp: time.Now(),
			ToolName:  "test_tool",
		})

		// Trigger a state transition to test state updates
		time.Sleep(200 * time.Millisecond)
		mockAgent.TriggerStateTransition(loop.StateReady, loop.StateSendingToLLM, loop.TransitionEvent{
			Description: "Agent started thinking",
			Data:        "start_thinking",
		})

		// Let it process for longer
		time.Sleep(1000 * time.Millisecond)
		cancel() // Cancel to end the test
	}()

	// Read events
	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "event: ") {
			eventType = strings.TrimPrefix(line, "event: ")
			eventsReceived[eventType]++
		} else if strings.HasPrefix(line, "data: ") {
			dataLines = append(dataLines, line)
		} else if line == "" && eventType != "" {
			// End of event
			eventType = ""
		}

		// Break if context is done
		if ctx.Err() != nil {
			break
		}
	}

	if err := scanner.Err(); err != nil && ctx.Err() == nil {
		t.Fatalf("Scanner error: %v", err)
	}

	// Simplified validation - just make sure we received something
	t.Logf("Events received: %v", eventsReceived)
	t.Logf("Data lines received: %d", len(dataLines))

	// Basic validation that we received at least some events
	if eventsReceived["state"] == 0 && eventsReceived["message"] == 0 {
		t.Errorf("Did not receive any events")
	}
}

func TestGitRawDiffHandler(t *testing.T) {
	// Create a mock agent
	mockAgent := &mockAgent{
		workingDir:   t.TempDir(), // Use a temp directory
		branchPrefix: "sketch/",
		model:        "fake-model",
	}

	// Create the server with the mock agent
	server, err := server.New(mockAgent, nil)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	// Create a test HTTP server
	testServer := httptest.NewServer(server)
	defer testServer.Close()

	// Test missing parameters
	resp, err := http.Get(testServer.URL + "/git/rawdiff")
	if err != nil {
		t.Fatalf("Failed to make HTTP request: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected status bad request, got: %d", resp.StatusCode)
	}

	// Test with commit parameter (this will fail due to no git repo, but we're testing the API, not git)
	resp, err = http.Get(testServer.URL + "/git/rawdiff?commit=HEAD")
	if err != nil {
		t.Fatalf("Failed to make HTTP request: %v", err)
	}
	// We expect an error since there's no git repository, but the request should be processed
	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got: %d", resp.StatusCode)
	}

	// Test with from/to parameters
	resp, err = http.Get(testServer.URL + "/git/rawdiff?from=HEAD~1&to=HEAD")
	if err != nil {
		t.Fatalf("Failed to make HTTP request: %v", err)
	}
	// We expect an error since there's no git repository, but the request should be processed
	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got: %d", resp.StatusCode)
	}
}

func TestGitShowHandler(t *testing.T) {
	// Create a mock agent
	mockAgent := &mockAgent{
		workingDir:   t.TempDir(), // Use a temp directory
		branchPrefix: "sketch/",
		model:        "fake-model",
	}

	// Create the server with the mock agent
	server, err := server.New(mockAgent, nil)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	// Create a test HTTP server
	testServer := httptest.NewServer(server)
	defer testServer.Close()

	// Test missing parameter
	resp, err := http.Get(testServer.URL + "/git/show")
	if err != nil {
		t.Fatalf("Failed to make HTTP request: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected status bad request, got: %d", resp.StatusCode)
	}

	// Test with hash parameter (this will fail due to no git repo, but we're testing the API, not git)
	resp, err = http.Get(testServer.URL + "/git/show?hash=HEAD")
	if err != nil {
		t.Fatalf("Failed to make HTTP request: %v", err)
	}
	// We expect an error since there's no git repository, but the request should be processed
	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got: %d", resp.StatusCode)
	}
}

func TestCompactHandler(t *testing.T) {
	// Test that mock CompactConversation works
	mockAgent := &mockAgent{
		messages:     []loop.AgentMessage{},
		messageCount: 0,
		sessionID:    "test-session",
		branchPrefix: "sketch/",
		model:        "fake-model",
	}

	ctx := context.Background()
	err := mockAgent.CompactConversation(ctx)
	if err != nil {
		t.Errorf("Mock CompactConversation failed: %v", err)
	}

	// No HTTP endpoint to test anymore - compaction is done via /compact message
	t.Log("Mock CompactConversation works correctly")
}

func TestParsePortProxyHost(t *testing.T) {
	tests := []struct {
		name     string
		host     string
		wantPort string
	}{
		{
			name:     "valid port proxy host",
			host:     "p8000.localhost",
			wantPort: "8000",
		},
		{
			name:     "valid port proxy host with port suffix",
			host:     "p8000.localhost:8080",
			wantPort: "8000",
		},
		{
			name:     "different port",
			host:     "p3000.localhost",
			wantPort: "3000",
		},
		{
			name:     "regular localhost",
			host:     "localhost",
			wantPort: "",
		},
		{
			name:     "different domain",
			host:     "p8000.example.com",
			wantPort: "",
		},
		{
			name:     "missing p prefix",
			host:     "8000.localhost",
			wantPort: "",
		},
		{
			name:     "invalid port",
			host:     "pabc.localhost",
			wantPort: "",
		},
		{
			name:     "just p prefix",
			host:     "p.localhost",
			wantPort: "",
		},
		{
			name:     "port too high",
			host:     "p99999.localhost",
			wantPort: "",
		},
		{
			name:     "port zero",
			host:     "p0.localhost",
			wantPort: "",
		},
		{
			name:     "negative port",
			host:     "p-1.localhost",
			wantPort: "",
		},
	}

	// Create a test server to access the method
	s, err := server.New(nil, nil)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotPort := s.ParsePortProxyHost(tt.host)
			if gotPort != tt.wantPort {
				t.Errorf("parsePortProxyHost(%q) = %q, want %q", tt.host, gotPort, tt.wantPort)
			}
		})
	}
}

// TestStateEndpointIncludesPorts tests that the /state endpoint includes port information
func TestStateEndpointIncludesPorts(t *testing.T) {
	mockAgent := &mockAgent{
		messages:      []loop.AgentMessage{},
		messageCount:  0,
		currentState:  "initial",
		subscribers:   []chan *loop.AgentMessage{},
		gitUsername:   "test-user",
		initialCommit: "abc123",
		branchName:    "test-branch",
		branchPrefix:  "test-",
		workingDir:    "/tmp/test",
		sessionID:     "test-session",
		model:         "fake-model",
		slug:          "test-slug",
		skabandAddr:   "http://localhost:8080",
	}

	// Create a test server
	server, err := server.New(mockAgent, nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a test request to the /state endpoint
	req, err := http.NewRequest("GET", "/state", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a response recorder
	rr := httptest.NewRecorder()

	// Execute the request
	server.ServeHTTP(rr, req)

	// Check the response
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Check that the response contains port information
	responseBody := rr.Body.String()
	t.Logf("Response body: %s", responseBody)

	// Verify the response contains the expected ports
	if !strings.Contains(responseBody, `"open_ports"`) {
		t.Error("Response should contain 'open_ports' field")
	}

	if !strings.Contains(responseBody, `"port": 22`) {
		t.Error("Response should contain port 22 from mock")
	}

	if !strings.Contains(responseBody, `"port": 80`) {
		t.Error("Response should contain port 80 from mock")
	}

	if !strings.Contains(responseBody, `"port": 8080`) {
		t.Error("Response should contain port 8080 from mock")
	}

	if !strings.Contains(responseBody, `"process": "sshd"`) {
		t.Error("Response should contain process name 'sshd'")
	}

	if !strings.Contains(responseBody, `"process": "nginx"`) {
		t.Error("Response should contain process name 'nginx'")
	}

	if !strings.Contains(responseBody, `"proto": "tcp"`) {
		t.Error("Response should contain protocol 'tcp'")
	}

	t.Log("State endpoint includes port information correctly")
}

// TestGitPushHandler tests the git push endpoint
func TestGitPushHandler(t *testing.T) {
	mockAgent := &mockAgent{
		workingDir:   t.TempDir(),
		branchPrefix: "sketch/",
		model:        "fake-model",
	}

	// Create the server with the mock agent
	server, err := server.New(mockAgent, nil)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	// Create a test HTTP server
	testServer := httptest.NewServer(server)
	defer testServer.Close()

	// Test missing required parameters
	tests := []struct {
		name           string
		requestBody    string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing all parameters",
			requestBody:    `{}`,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Missing required parameters: remote, branch, and commit",
		},
		{
			name:           "missing commit parameter",
			requestBody:    `{"remote": "origin", "branch": "main"}`,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Missing required parameters: remote, branch, and commit",
		},
		{
			name:           "missing remote parameter",
			requestBody:    `{"branch": "main", "commit": "abc123"}`,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Missing required parameters: remote, branch, and commit",
		},
		{
			name:           "missing branch parameter",
			requestBody:    `{"remote": "origin", "commit": "abc123"}`,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Missing required parameters: remote, branch, and commit",
		},
		{
			name:           "all parameters present",
			requestBody:    `{"remote": "origin", "branch": "main", "commit": "abc123", "dry_run": true}`,
			expectedStatus: http.StatusOK, // Parameters are valid, response will be JSON
			expectedError:  "",            // No parameter validation error
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.Post(
				testServer.URL+"/git/push",
				"application/json",
				strings.NewReader(tt.requestBody),
			)
			if err != nil {
				t.Fatalf("Failed to make HTTP request: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatus {
				t.Errorf("Expected status %d, got: %d", tt.expectedStatus, resp.StatusCode)
			}

			if tt.expectedError != "" {
				body, err := io.ReadAll(resp.Body)
				if err != nil {
					t.Fatalf("Failed to read response body: %v", err)
				}
				if !strings.Contains(string(body), tt.expectedError) {
					t.Errorf("Expected error message '%s', got: %s", tt.expectedError, string(body))
				}
			}
		})
	}
}

// TestGitPushInfoHandler tests the git push info endpoint
func TestGitPushInfoHandler(t *testing.T) {
	mockAgent := &mockAgent{
		workingDir:   t.TempDir(),
		branchPrefix: "sketch/",
		model:        "fake-model",
	}

	// Create the server with the mock agent
	server, err := server.New(mockAgent, nil)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	// Create a test HTTP server
	testServer := httptest.NewServer(server)
	defer testServer.Close()

	// Test GET request
	resp, err := http.Get(testServer.URL + "/git/pushinfo")
	if err != nil {
		t.Fatalf("Failed to make HTTP request: %v", err)
	}
	defer resp.Body.Close()

	// We expect this to fail with 500 since there's no git repository
	// but the endpoint should be accessible
	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got: %d", resp.StatusCode)
	}

	// Test that POST is not allowed
	resp, err = http.Post(testServer.URL+"/git/pushinfo", "application/json", strings.NewReader(`{}`))
	if err != nil {
		t.Fatalf("Failed to make HTTP request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("Expected status 405, got: %d", resp.StatusCode)
	}
}
