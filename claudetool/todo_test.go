package claudetool

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTodoReadEmpty(t *testing.T) {
	ctx := WithSessionID(context.Background(), "test-session-1")

	// Ensure todo file doesn't exist
	todoPath := todoFilePathForContext(ctx)
	os.Remove(todoPath)

	toolOut := todoReadRun(ctx, []byte("{}"))
	if toolOut.Error != nil {
		t.Fatalf("expected no error, got %v", toolOut.Error)
	}
	result := toolOut.LLMContent

	if len(result) != 1 {
		t.Fatalf("expected 1 content item, got %d", len(result))
	}

	expected := "No todo list found. Use todo_write to create one."
	if result[0].Text != expected {
		t.Errorf("expected %q, got %q", expected, result[0].Text)
	}
}

func TestTodoWriteAndRead(t *testing.T) {
	ctx := WithSessionID(context.Background(), "test-session-2")

	// Clean up
	todoPath := todoFilePathForContext(ctx)
	defer os.Remove(todoPath)
	os.Remove(todoPath)

	// Write some todos
	todos := []TodoItem{
		{ID: "1", Task: "Implement todo tools", Status: "completed"},
		{ID: "2", Task: "Update system prompt", Status: "in-progress"},
		{ID: "3", Task: "Write tests", Status: "queued"},
	}

	writeInput := TodoWriteInput{Tasks: todos}
	writeInputJSON, _ := json.Marshal(writeInput)

	toolOut := todoWriteRun(ctx, writeInputJSON)
	if toolOut.Error != nil {
		t.Fatalf("expected no error, got %v", toolOut.Error)
	}
	result := toolOut.LLMContent

	if len(result) != 1 {
		t.Fatalf("expected 1 content item, got %d", len(result))
	}

	expected := "Updated todo list with 3 items."
	if result[0].Text != expected {
		t.Errorf("expected %q, got %q", expected, result[0].Text)
	}

	// Read the todos back
	toolOut = todoReadRun(ctx, []byte("{}"))
	if toolOut.Error != nil {
		t.Fatalf("expected no error, got %v", toolOut.Error)
	}
	result = toolOut.LLMContent

	if len(result) != 1 {
		t.Fatalf("expected 1 content item, got %d", len(result))
	}

	resultText := result[0].Text
	if !strings.Contains(resultText, "<todo_list count=\"3\">") {
		t.Errorf("expected result to contain XML todo list header, got %q", resultText)
	}

	// Check that all todos are present with proper XML structure
	if !strings.Contains(resultText, `<task id="1" status="completed">Implement todo tools</task>`) {
		t.Errorf("expected result to contain first todo in XML format, got %q", resultText)
	}
	if !strings.Contains(resultText, `<task id="2" status="in-progress">Update system prompt</task>`) {
		t.Errorf("expected result to contain second todo in XML format, got %q", resultText)
	}
	if !strings.Contains(resultText, `<task id="3" status="queued">Write tests</task>`) {
		t.Errorf("expected result to contain third todo in XML format, got %q", resultText)
	}

	// Check XML structure
	if !strings.Contains(resultText, "</todo_list>") {
		t.Errorf("expected result to contain closing XML tag, got %q", resultText)
	}
}

func TestTodoWriteMultipleInProgress(t *testing.T) {
	ctx := WithSessionID(context.Background(), "test-session-3")

	// Try to write todos with multiple in-progress items
	todos := []TodoItem{
		{ID: "1", Task: "Task 1", Status: "in-progress"},
		{ID: "2", Task: "Task 2", Status: "in-progress"},
	}

	writeInput := TodoWriteInput{Tasks: todos}
	writeInputJSON, _ := json.Marshal(writeInput)

	toolOut := todoWriteRun(ctx, writeInputJSON)
	if toolOut.Error == nil {
		t.Fatal("expected error for multiple in_progress tasks, got none")
	}

	expected := "only one task can be 'in-progress' at a time, found 2"
	if toolOut.Error.Error() != expected {
		t.Errorf("expected error %q, got %q", expected, toolOut.Error.Error())
	}
}

func TestTodoSessionIsolation(t *testing.T) {
	// Test that different sessions have different todo files
	ctx1 := WithSessionID(context.Background(), "session-1")
	ctx2 := WithSessionID(context.Background(), "session-2")

	path1 := todoFilePathForContext(ctx1)
	path2 := todoFilePathForContext(ctx2)

	if path1 == path2 {
		t.Errorf("expected different paths for different sessions, both got %q", path1)
	}

	expected1 := filepath.Join("/tmp", "session-1", "todos.json")
	expected2 := filepath.Join("/tmp", "session-2", "todos.json")

	if path1 != expected1 {
		t.Errorf("expected path1 %q, got %q", expected1, path1)
	}

	if path2 != expected2 {
		t.Errorf("expected path2 %q, got %q", expected2, path2)
	}
}

func TestTodoFallbackPath(t *testing.T) {
	// Test fallback when no session ID in context
	ctx := context.Background() // No session ID

	path := todoFilePathForContext(ctx)
	expected := "/tmp/sketch_todos.json"

	if path != expected {
		t.Errorf("expected fallback path %q, got %q", expected, path)
	}
}
