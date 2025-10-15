package cortex

import (
	"testing"

	"sketch.dev/llm"
)

func TestConvertRequest_FiltersEmptyMessages(t *testing.T) {
	req := &llm.Request{
		Messages: []llm.Message{
			{
				Role:    llm.MessageRoleUser,
				Content: []llm.Content{{Type: llm.ContentTypeText, Text: "Hello"}},
			},
			{
				Role:    llm.MessageRoleAssistant,
				Content: []llm.Content{}, // Empty content
			},
			{
				Role:    llm.MessageRoleUser,
				Content: []llm.Content{{Type: llm.ContentTypeText, Text: ""}}, // Empty text
			},
			{
				Role:    llm.MessageRoleUser,
				Content: []llm.Content{{Type: llm.ContentTypeText, Text: "World"}},
			},
		},
	}

	client := NewClient()
	cortexReq := client.convertRequest(req)

	// Should only have 2 messages (the two with non-empty content)
	if len(cortexReq.Messages) != 2 {
		t.Errorf("Expected 2 messages, got %d", len(cortexReq.Messages))
	}

	// First message should be "Hello"
	if cortexReq.Messages[0].Content[0].Text != "Hello" {
		t.Errorf("Expected first message to be 'Hello', got '%s'", cortexReq.Messages[0].Content[0].Text)
	}

	// Second message should be "World"
	if cortexReq.Messages[1].Content[0].Text != "World" {
		t.Errorf("Expected second message to be 'World', got '%s'", cortexReq.Messages[1].Content[0].Text)
	}
}

func TestConvertRequest_FiltersEmptyTextContent(t *testing.T) {
	req := &llm.Request{
		Messages: []llm.Message{
			{
				Role: llm.MessageRoleUser,
				Content: []llm.Content{
					{Type: llm.ContentTypeText, Text: ""},
					{Type: llm.ContentTypeText, Text: "Valid text"},
					{Type: llm.ContentTypeText, Text: ""},
				},
			},
		},
	}

	client := NewClient()
	cortexReq := client.convertRequest(req)

	// Should have 1 message with 1 content item
	if len(cortexReq.Messages) != 1 {
		t.Errorf("Expected 1 message, got %d", len(cortexReq.Messages))
	}

	if len(cortexReq.Messages[0].Content) != 1 {
		t.Errorf("Expected 1 content item, got %d", len(cortexReq.Messages[0].Content))
	}

	if cortexReq.Messages[0].Content[0].Text != "Valid text" {
		t.Errorf("Expected 'Valid text', got '%s'", cortexReq.Messages[0].Content[0].Text)
	}
}

func TestConvertRequest_PreservesToolUse(t *testing.T) {
	req := &llm.Request{
		Messages: []llm.Message{
			{
				Role: llm.MessageRoleAssistant,
				Content: []llm.Content{
					{Type: llm.ContentTypeText, Text: "Using tool"},
					{Type: llm.ContentTypeToolUse, ID: "tool_123", ToolName: "bash"},
				},
			},
		},
	}

	client := NewClient()
	cortexReq := client.convertRequest(req)

	// Should preserve both content items
	if len(cortexReq.Messages) != 1 {
		t.Errorf("Expected 1 message, got %d", len(cortexReq.Messages))
	}

	if len(cortexReq.Messages[0].Content) != 2 {
		t.Errorf("Expected 2 content items, got %d", len(cortexReq.Messages[0].Content))
	}

	if cortexReq.Messages[0].Content[1].Type != "tool_use" {
		t.Errorf("Expected tool_use, got %s", cortexReq.Messages[0].Content[1].Type)
	}
}
