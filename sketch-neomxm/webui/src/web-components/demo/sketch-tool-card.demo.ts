import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Sketch Tool Card Demo",
  description:
    "Demonstration of different tool card components for various tool types",
  imports: [
    "../sketch-tool-card.ts",
    "../sketch-tool-card-about-sketch.ts",
    "../sketch-tool-card-browser-clear-console-logs.ts",
    "../sketch-tool-card-browser-click.ts",
    "../sketch-tool-card-browser-eval.ts",
    "../sketch-tool-card-browser-get-text.ts",
    "../sketch-tool-card-browser-navigate.ts",
    "../sketch-tool-card-browser-recent-console-logs.ts",
    "../sketch-tool-card-browser-resize.ts",
    "../sketch-tool-card-browser-scroll-into-view.ts",
    "../sketch-tool-card-browser-type.ts",
    "../sketch-tool-card-read-image.ts",
    "../sketch-tool-card-take-screenshot.ts",
  ],

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "Tool Card Components",
      "Shows different tool card components for bash, codereview, done, patch, think, and title tools",
    );

    // Sample tool calls from the original demo
    const toolCalls = [
      {
        name: "bash",
        input: JSON.stringify({
          command:
            "docker ps -a --format '{{.ID}} {{.Image }} {{.Names}}' | grep sketch",
          background: true,
          slow_ok: true,
        }),
        result_message: {
          type: "tool",
          tool_result: `Deleted Images:
deleted: sha256:110d4aed8bcc76cb7327412504af8aef31670b816453a3088d834bbeefd11a2c
deleted: sha256:042622460c913078901555a8a72de18e95228fca98b9ac388503b3baafafb683

Total reclaimed space: 1.426GB`,
        },
      },
      {
        name: "bash",
        input: JSON.stringify({
          command: "sleep 200",
          slow_ok: true,
        }),
        result_message: {
          type: "tool",
          tool_error: "the user canceled this operation",
        },
      },
      {
        name: "codereview",
        input: "{}",
        tool_call_id: "toolu_01WT5qQwHZgdogfKhkD8R9PZ",
        result_message: {
          type: "tool",
          end_of_turn: false,
          content: "",
          tool_name: "codereview",
          input: "{}",
          tool_result: "OK",
          tool_call_id: "toolu_01WT5qQwHZgdogfKhkD8R9PZ",
          timestamp: "2025-04-14T16:33:17.575759565Z",
          conversation_id: "xsa-8hw0",
          start_time: "2025-04-14T16:33:07.11793816Z",
          end_time: "2025-04-14T16:33:17.57575719Z",
          elapsed: 10457819031,
          idx: 45,
        },
      },
      {
        name: "think",
        input: JSON.stringify({
          thoughts:
            "I'm going to inspect a few key components to understand their purpose and relationships:\n1. sketch-app-shell.ts - Appears to be the main container component\n2. sketch-timeline.ts - Likely manages the chat timeline\n3. sketch-view-mode-select.ts - Handles switching between different views",
        }),
        tool_call_id: "toolu_01R1g5mQVgKxEJZFNp9QGvUr",
        result_message: {
          type: "tool",
          end_of_turn: false,
          content: "",
          tool_name: "think",
          input: JSON.stringify({
            thoughts:
              "I'm going to inspect a few key components to understand their purpose and relationships",
          }),
          tool_result: "recorded",
          tool_call_id: "toolu_01R1g5mQVgKxEJZFNp9QGvUr",
          timestamp: "2025-04-14T16:32:14.12647133Z",
          conversation_id: "xsa-8hw0",
          start_time: "2025-04-14T16:32:14.126454329Z",
          end_time: "2025-04-14T16:32:14.126468539Z",
          elapsed: 14209,
          idx: 18,
        },
      },
      {
        name: "patch",
        input: JSON.stringify({
          path: "/app/webui/src/web-components/README.md",
          patches: [
            {
              operation: "overwrite",
              newText:
                "# Web Components\n\nThis directory contains custom web components...",
            },
          ],
        }),
        tool_call_id: "toolu_01TNhLX2AWkZwsu2KCLKrpju",
        result_message: {
          type: "tool",
          tool_result: "- Applied all patches\n",
          display:
            "@@ -1,3 +1,3 @@\n # Web Components\n \n-This directory contains the old components.\n+This directory contains custom web components...",
          tool_call_id: "toolu_01TNhLX2AWkZwsu2KCLKrpju",
        },
      },
      {
        name: "title",
        input: JSON.stringify({
          title: "a new title for this sketch",
        }),
      },
      {
        name: "done",
        input: JSON.stringify({
          code_reviewed: {
            status: "yes",
            description:
              "If any commits were made, the codereview tool was run and its output was addressed.",
            comments: "Code review completed successfully",
          },
          git_commit: {
            status: "yes",
            description: "Create git commits for any code changes you made.",
            comments: "All changes committed",
          },
        }),
        tool_call_id: "toolu_01HPgWQJF1aF9LUqkdDKWeES",
        result_message: {
          type: "tool",
          tool_result:
            "codereview tool has not been run for commit 0b1f45dc17fbe7800f5164993ec99d6564256787",
          tool_error: true,
          tool_call_id: "toolu_01HPgWQJF1aF9LUqkdDKWeES",
        },
      },
      // About Sketch tool
      {
        name: "about_sketch",
        input: "{}",
        tool_call_id: "toolu_about_sketch",
        result_message: {
          type: "tool",
          tool_result:
            "# Welcome to Sketch\n\nSketch is an AI-powered coding assistant that helps you implement features, debug issues, and understand codebases.\n\n## Key Features\n\n- **Autonomous coding**: I can read, write, and modify code files\n- **Command execution**: I can run shell commands and scripts\n- **Testing**: I can run tests and interpret results\n- **Code review**: I can analyze code quality and suggest improvements\n\n## Getting Started\n\n1. Describe what you want to build or fix\n2. I'll analyze your codebase and create a plan\n3. I'll implement the changes step by step\n4. You can review and provide feedback at any time",
          tool_call_id: "toolu_about_sketch",
        },
      },
      // Browser navigation
      {
        name: "browser_navigate",
        input: JSON.stringify({ url: "https://example.com" }),
        tool_call_id: "toolu_navigate",
        result_message: {
          type: "tool",
          tool_result: "Navigated to https://example.com",
          tool_call_id: "toolu_navigate",
        },
      },
      // Browser eval
      {
        name: "browser_eval",
        input: JSON.stringify({ expression: "document.title" }),
        tool_call_id: "toolu_eval",
        result_message: {
          type: "tool",
          tool_result: "Example Domain",
          tool_call_id: "toolu_eval",
        },
      },
      // Browser resize
      {
        name: "browser_resize",
        input: JSON.stringify({ width: 1024, height: 768 }),
        tool_call_id: "toolu_resize",
        result_message: {
          type: "tool",
          tool_result: "done",
          tool_call_id: "toolu_resize",
        },
      },
      // Browser clear console logs
      {
        name: "browser_clear_console_logs",
        input: "{}",
        tool_call_id: "toolu_clear_logs",
        result_message: {
          type: "tool",
          tool_result: "Console logs cleared",
          tool_call_id: "toolu_clear_logs",
        },
      },
      // Browser recent console logs
      {
        name: "browser_recent_console_logs",
        input: "{}",
        tool_call_id: "toolu_recent_logs",
        result_message: {
          type: "tool",
          tool_result:
            "[INFO] Page loaded successfully\n[WARN] Deprecated API usage detected\n[ERROR] Failed to load resource: net::ERR_FAILED",
          tool_call_id: "toolu_recent_logs",
        },
      },
      // Read image
      {
        name: "read_image",
        input: JSON.stringify({ path: "/tmp/screenshot.png" }),
        tool_call_id: "toolu_read_image",
        result_message: {
          type: "tool",
          tool_result:
            "Image read successfully: /tmp/screenshot.png (1024x768, 245KB)",
          tool_call_id: "toolu_read_image",
        },
      },
      // Take screenshot
      {
        name: "browser_take_screenshot",
        input: JSON.stringify({ selector: ".main-content" }),
        tool_call_id: "toolu_screenshot",
        result_message: {
          type: "tool",
          tool_result:
            "Screenshot taken (saved as /tmp/sketch-screenshots/demo-123.png)",
          tool_call_id: "toolu_screenshot",
        },
      },
    ];

    // Create tool cards for each tool call
    toolCalls.forEach((toolCall) => {
      const toolSection = document.createElement("div");
      toolSection.style.marginBottom = "2rem";
      toolSection.style.border = "1px solid #eee";
      toolSection.style.borderRadius = "8px";
      toolSection.style.padding = "1rem";

      const header = document.createElement("h3");
      header.textContent = `Tool: ${toolCall.name}`;
      header.style.marginTop = "0";
      header.style.marginBottom = "1rem";
      header.style.color = "#333";
      toolSection.appendChild(header);

      // Create the appropriate tool card element
      let toolCardEl;
      switch (toolCall.name) {
        case "bash":
          toolCardEl = document.createElement("sketch-tool-card-bash");
          break;
        case "codereview":
          toolCardEl = document.createElement("sketch-tool-card-codereview");
          break;
        case "done":
          toolCardEl = document.createElement("sketch-tool-card-done");
          break;
        case "patch":
          toolCardEl = document.createElement("sketch-tool-card-patch");
          break;
        case "think":
          toolCardEl = document.createElement("sketch-tool-card-think");
          break;
        case "title":
          toolCardEl = document.createElement("sketch-tool-card-title");
          break;
        case "about_sketch":
          toolCardEl = document.createElement("sketch-tool-card-about-sketch");
          break;
        case "browser_navigate":
          toolCardEl = document.createElement(
            "sketch-tool-card-browser-navigate",
          );
          break;
        case "browser_eval":
          toolCardEl = document.createElement("sketch-tool-card-browser-eval");
          break;
        case "browser_resize":
          toolCardEl = document.createElement(
            "sketch-tool-card-browser-resize",
          );
          break;
        case "browser_clear_console_logs":
          toolCardEl = document.createElement(
            "sketch-tool-card-browser-clear-console-logs",
          );
          break;
        case "browser_recent_console_logs":
          toolCardEl = document.createElement(
            "sketch-tool-card-browser-recent-console-logs",
          );
          break;
        case "read_image":
          toolCardEl = document.createElement("sketch-tool-card-read-image");
          break;
        case "browser_take_screenshot":
          toolCardEl = document.createElement(
            "sketch-tool-card-take-screenshot",
          );
          break;
        default:
          toolCardEl = document.createElement("sketch-tool-card-generic");
          break;
      }

      toolCardEl.toolCall = toolCall;
      toolCardEl.open = true;

      toolSection.appendChild(toolCardEl);
      section.appendChild(toolSection);
    });

    container.appendChild(section);
  },
};

export default demo;
