package server

import (
	"net/http/httptest"
	"strings"
	"testing"

	"sketch.dev/llm"
)

func TestRenderToolsDebugPage_UsesPre(t *testing.T) {
	tools := []*llm.Tool{
		{
			Name:        "test_tool",
			Description: "This is a test tool\nwith multiple lines\nand formatting",
			InputSchema: []byte(`{"type": "object"}`),
		},
	}

	w := httptest.NewRecorder()
	renderToolsDebugPage(w, tools)
	html := w.Body.String()

	// Verify CSS includes pre-wrap styling
	if !strings.Contains(html, "white-space: pre-wrap") {
		t.Error("Expected CSS to contain 'white-space: pre-wrap'")
	}
	if !strings.Contains(html, "font-family: 'SF Mono', Monaco, monospace") {
		t.Error("Expected CSS to contain monospace font-family")
	}

	// Verify HTML uses <pre> tag for tool description
	if !strings.Contains(html, `<pre class="tool-description">`) {
		t.Error("Expected HTML to use <pre class=\"tool-description\"> tag")
	}
	if strings.Contains(html, `<div class="tool-description">`) {
		t.Error("Expected HTML to NOT use <div class=\"tool-description\"> tag")
	}

	// Verify HTML uses <pre> tag for tool schema
	if !strings.Contains(html, `<pre class="tool-schema">`) {
		t.Error("Expected HTML to use <pre class=\"tool-schema\"> tag")
	}
	if strings.Contains(html, `<div class="tool-schema">`) {
		t.Error("Expected HTML to NOT use <div class=\"tool-schema\"> tag")
	}

	// Verify CSS includes white-space: pre for schemas
	if !strings.Contains(html, "white-space: pre") {
		t.Error("Expected CSS to contain 'white-space: pre' for schemas")
	}

	// Verify the description content is preserved
	if !strings.Contains(html, "This is a test tool") {
		t.Error("Expected tool description to be included")
	}
}
