package loop

import (
	"context"
	"reflect"
	"sync"
	"testing"

	"github.com/spinility/sketch-neomxm/llm"
	"github.com/spinility/sketch-neomxm/llm/conversation"
)

// MockConvo is a custom mock for conversation.Convo interface
type MockConvo struct {
	mu sync.Mutex
	t  *testing.T

	// Maps method name to a list of calls with arguments and return values
	calls map[string][]*mockCall
	// Maps method name to expected calls
	expectations map[string][]*mockExpectation
}

type mockCall struct {
	args   []any
	result []any
}

type mockExpectation struct {
	until  chan any
	args   []any
	result []any
}

// Return sets up return values for an expectation
func (e *mockExpectation) Return(values ...any) {
	e.result = values
}

// Return sets up return values for an expectation
func (e *mockExpectation) BlockAndReturn(until chan any, values ...any) {
	e.until = until
	e.result = values
}

// NewMockConvo creates a new mock Convo
func NewMockConvo(t *testing.T) *MockConvo {
	return &MockConvo{
		t:            t,
		mu:           sync.Mutex{},
		calls:        make(map[string][]*mockCall),
		expectations: make(map[string][]*mockExpectation),
	}
}

// ExpectCall sets up an expectation for a method call
func (m *MockConvo) ExpectCall(method string, args ...any) *mockExpectation {
	m.mu.Lock()
	defer m.mu.Unlock()
	expectation := &mockExpectation{args: args}
	if _, ok := m.expectations[method]; !ok {
		m.expectations[method] = []*mockExpectation{}
	}
	m.expectations[method] = append(m.expectations[method], expectation)
	return expectation
}

// findMatchingExpectation finds a matching expectation for a method call
func (m *MockConvo) findMatchingExpectation(method string, args ...any) (*mockExpectation, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	expectations, ok := m.expectations[method]
	if !ok {
		return nil, false
	}

	for i, exp := range expectations {
		if matchArgs(exp.args, args) {
			if exp.until != nil {
				<-exp.until
			}
			// Remove the matched expectation
			m.expectations[method] = append(expectations[:i], expectations[i+1:]...)
			return exp, true
		}
	}
	return nil, false
}

// matchArgs checks if call arguments match expectation arguments
func matchArgs(expected, actual []any) bool {
	if len(expected) != len(actual) {
		return false
	}

	for i, exp := range expected {
		// Special case: nil matches anything
		if exp == nil {
			continue
		}

		// Check for equality
		if !reflect.DeepEqual(exp, actual[i]) {
			return false
		}
	}
	return true
}

// recordCall records a method call
func (m *MockConvo) recordCall(method string, args ...any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.calls[method]; !ok {
		m.calls[method] = []*mockCall{}
	}
	m.calls[method] = append(m.calls[method], &mockCall{args: args})
}

func (m *MockConvo) SendMessage(message llm.Message) (*llm.Response, error) {
	m.recordCall("SendMessage", message)
	exp, ok := m.findMatchingExpectation("SendMessage", message)
	if !ok {
		m.t.Errorf("unexpected call to SendMessage: %+v", message)
		m.t.FailNow()
	}
	var retErr error
	m.mu.Lock()
	defer m.mu.Unlock()
	if err, ok := exp.result[1].(error); ok {
		retErr = err
	}
	return exp.result[0].(*llm.Response), retErr
}

func (m *MockConvo) SendUserTextMessage(message string, otherContents ...llm.Content) (*llm.Response, error) {
	m.recordCall("SendUserTextMessage", message, otherContents)
	exp, ok := m.findMatchingExpectation("SendUserTextMessage", message, otherContents)
	if !ok {
		m.t.Error("unexpected call to SendUserTextMessage")
		m.t.FailNow()
	}
	var retErr error
	m.mu.Lock()
	defer m.mu.Unlock()
	if err, ok := exp.result[1].(error); ok {
		retErr = err
	}
	return exp.result[0].(*llm.Response), retErr
}

func (m *MockConvo) ToolResultContents(ctx context.Context, resp *llm.Response) ([]llm.Content, bool, error) {
	m.recordCall("ToolResultContents", resp)
	exp, ok := m.findMatchingExpectation("ToolResultContents", resp)
	if !ok {
		m.t.Error("unexpected call to ToolResultContents")
		m.t.FailNow()
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	var retErr error
	if err, ok := exp.result[1].(error); ok {
		retErr = err
	}

	return exp.result[0].([]llm.Content), false, retErr
}

func (m *MockConvo) ToolResultCancelContents(resp *llm.Response) ([]llm.Content, error) {
	m.recordCall("ToolResultCancelContents", resp)
	exp, ok := m.findMatchingExpectation("ToolResultCancelContents", resp)
	if !ok {
		m.t.Error("unexpected call to ToolResultCancelContents")
		m.t.FailNow()
	}
	var retErr error
	m.mu.Lock()
	defer m.mu.Unlock()
	if err, ok := exp.result[1].(error); ok {
		retErr = err
	}

	return exp.result[0].([]llm.Content), retErr
}

func (m *MockConvo) CumulativeUsage() conversation.CumulativeUsage {
	m.recordCall("CumulativeUsage")
	return conversation.CumulativeUsage{}
}

func (m *MockConvo) LastUsage() llm.Usage {
	m.recordCall("LastUsage")
	return llm.Usage{}
}

func (m *MockConvo) OverBudget() error {
	m.recordCall("OverBudget")
	return nil
}

func (m *MockConvo) GetID() string {
	m.recordCall("GetID")
	return "mock-conversation-id"
}

func (m *MockConvo) SubConvoWithHistory() *conversation.Convo {
	m.recordCall("SubConvoWithHistory")
	return nil
}

func (m *MockConvo) ResetBudget(_ conversation.Budget) {
	m.recordCall("ResetBudget")
}

// AssertExpectations checks that all expectations were met
func (m *MockConvo) AssertExpectations(t *testing.T) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for method, expectations := range m.expectations {
		if len(expectations) > 0 {
			t.Errorf("not all expectations were met for method %s:", method)
		}
	}
}

// CancelToolUse cancels a tool use
func (m *MockConvo) CancelToolUse(toolUseID string, cause error) error {
	m.recordCall("CancelToolUse", toolUseID, cause)
	exp, ok := m.findMatchingExpectation("CancelToolUse", toolUseID, cause)
	if !ok {
		m.t.Errorf("unexpected call to CancelToolUse: %s, %v", toolUseID, cause)
		return nil
	}

	var retErr error
	m.mu.Lock()
	defer m.mu.Unlock()
	if err, ok := exp.result[0].(error); ok {
		retErr = err
	}

	return retErr
}

// DebugJSON returns mock conversation data as JSON for debugging purposes
func (m *MockConvo) DebugJSON() ([]byte, error) {
	m.recordCall("DebugJSON")
	exp, ok := m.findMatchingExpectation("DebugJSON")
	if !ok {
		// Return a simple mock JSON response if no expectation is set
		return []byte(`{"mock": "conversation", "calls": {}}`), nil
	}

	var retErr error
	m.mu.Lock()
	defer m.mu.Unlock()
	if err, ok := exp.result[1].(error); ok {
		retErr = err
	}

	return exp.result[0].([]byte), retErr
}
