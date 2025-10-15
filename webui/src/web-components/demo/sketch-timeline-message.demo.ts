/**
 * Demo module for sketch-timeline-message component
 */

import { DemoModule } from "./demo-framework/types";
import { demoUtils, longTimelineMessage } from "./demo-fixtures/index";
import type { AgentMessage } from "../../types";

const demo: DemoModule = {
  title: "Timeline Message Demo",
  description:
    "Interactive timeline message component with various message types and features",
  imports: ["../sketch-timeline-message"],
  styles: ["/dist/tailwind.css"],

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const messageTypesSection = demoUtils.createDemoSection(
      "Message Types",
      "Different types of timeline messages with various content",
    );

    const interactiveSection = demoUtils.createDemoSection(
      "Interactive Features",
      "Test copy buttons, info panels, and commit interactions",
    );

    const advancedSection = demoUtils.createDemoSection(
      "Advanced Examples",
      "Complex messages with tool calls, commits, and markdown content",
    );

    // Mock state for components
    const mockState = {
      session_id: "demo-session",
      git_username: "demo.user",
      link_to_github: true,
      git_origin: "https://github.com/boldsoftware/bold.git",
    };

    // Helper function to create timeline message component
    const createTimelineMessage = (
      message: AgentMessage,
      label: string,
      state = mockState,
    ) => {
      const wrapper = document.createElement("div");
      wrapper.className =
        "my-4 p-4 border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800";

      const labelEl = document.createElement("h4");
      labelEl.textContent = label;
      labelEl.style.cssText =
        "margin: 0 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

      const messageComponent = document.createElement(
        "sketch-timeline-message",
      ) as any;
      messageComponent.message = message;
      messageComponent.state = state;
      messageComponent.open = true;

      wrapper.appendChild(labelEl);
      wrapper.appendChild(messageComponent);
      return wrapper;
    };

    // Create sample messages
    const userMessage: AgentMessage = {
      idx: 0,
      type: "user",
      content:
        "Hello, can you help me fix this bug in my code?\n\n```javascript\nfunction broken() {\n  // This function is broken\n  return undefined;\n}\n```",
      timestamp: "2023-05-15T12:00:00Z",
      elapsed: 1500000000,
      end_of_turn: false,
      conversation_id: "demo-conversation",
      tool_calls: [],
    };

    const agentMessage: AgentMessage = {
      idx: 1,
      type: "agent",
      content:
        "I can help you fix that bug! Here's the corrected version:\n\n```javascript\nfunction fixed() {\n  // This function now works correctly\n  return \"success\";\n}\n```\n\nThe issue was that the function wasn't returning a meaningful value.",
      timestamp: "2023-05-15T12:01:00Z",
      elapsed: 2500000000,
      end_of_turn: true,
      conversation_id: "demo-conversation",
      tool_calls: [],
      usage: {
        input_tokens: 150,
        output_tokens: 300,
        cost_usd: 0.025,
        cache_read_input_tokens: 50,
        cache_creation_input_tokens: 0,
      },
    };

    const toolCallMessage: AgentMessage = {
      idx: 2,
      type: "agent",
      content: "Let me run some tests to verify the fix:",
      timestamp: "2023-05-15T12:02:00Z",
      elapsed: 3500000000,
      end_of_turn: false,
      conversation_id: "demo-conversation",
      tool_calls: [
        {
          name: "bash",
          input: '{command:"npm test"}',
          tool_call_id: "toolu_bash_123",
          result:
            "✓ All tests passed!\n✓ 15 tests completed\n✓ Code coverage: 95%",
        },
      ],
    };

    const commitMessage: AgentMessage = {
      idx: 3,
      type: "agent",
      content: "Perfect! I've committed the changes:",
      timestamp: "2023-05-15T12:03:00Z",
      elapsed: 1000000000,
      end_of_turn: true,
      conversation_id: "demo-conversation",
      tool_calls: [],
      commits: [
        {
          hash: "1234567890abcdef",
          subject: "Fix broken function return value",
          body: "Updated function to return meaningful value instead of undefined\n\nSigned-off-by: Demo User <demo@example.com>",
          pushed_branch: "main",
        },
      ],
    };

    const errorMessage: AgentMessage = {
      idx: 4,
      type: "error",
      content:
        "An error occurred while processing your request. Please check the logs for more details.",
      timestamp: "2023-05-15T12:04:00Z",
      elapsed: 500000000,
      end_of_turn: true,
      conversation_id: "demo-conversation",
      tool_calls: [],
    };

    // Create message type examples
    const userMessageExample = createTimelineMessage(
      userMessage,
      "User Message - With code block and username",
    );
    const agentMessageExample = createTimelineMessage(
      agentMessage,
      "Agent Message - With usage info and end-of-turn",
    );
    const errorMessageExample = createTimelineMessage(
      errorMessage,
      "Error Message - Error state styling",
    );

    messageTypesSection.appendChild(userMessageExample);
    messageTypesSection.appendChild(agentMessageExample);
    messageTypesSection.appendChild(errorMessageExample);

    // Interactive message component
    const interactiveMessage = document.createElement(
      "sketch-timeline-message",
    ) as any;
    interactiveMessage.message = {
      ...agentMessage,
      content:
        "This is an interactive message. Try clicking the info button to see message details, or hover to see the copy button.",
    };
    interactiveMessage.state = mockState;
    interactiveMessage.open = true;

    const interactiveWrapper = document.createElement("div");
    interactiveWrapper.className =
      "p-4 border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800";
    interactiveWrapper.appendChild(interactiveMessage);

    // Control buttons for interactive demo
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText =
      "margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px;";

    const toggleInfoButton = demoUtils.createButton("Toggle Info Panel", () => {
      interactiveMessage.showInfo = !interactiveMessage.showInfo;
    });

    const changeTypeButton = demoUtils.createButton(
      "Change Message Type",
      () => {
        const types = ["user", "agent", "error", "tool"];
        const currentIndex = types.indexOf(interactiveMessage.message.type);
        const nextIndex = (currentIndex + 1) % types.length;
        interactiveMessage.message = {
          ...interactiveMessage.message,
          type: types[nextIndex],
        };
      },
    );

    const toggleCompactButton = demoUtils.createButton(
      "Toggle Compact Padding",
      () => {
        interactiveMessage.compactPadding = !interactiveMessage.compactPadding;
      },
    );

    const changeContentButton = demoUtils.createButton("Change Content", () => {
      const contents = [
        "Simple message with plain text.",
        "Message with **markdown** formatting and `code`.",
        "# Heading\n\nMessage with heading and list:\n\n- Item 1\n- Item 2\n- Item 3",
        "```python\ndef hello_world():\n    print('Hello, World!')\n```\n\nMessage with code block.",
      ];
      const currentIndex = contents.indexOf(interactiveMessage.message.content);
      const nextIndex = (currentIndex + 1) % contents.length;
      interactiveMessage.message = {
        ...interactiveMessage.message,
        content: contents[nextIndex],
      };
    });

    controlsDiv.appendChild(toggleInfoButton);
    controlsDiv.appendChild(changeTypeButton);
    controlsDiv.appendChild(toggleCompactButton);
    controlsDiv.appendChild(changeContentButton);

    interactiveWrapper.appendChild(controlsDiv);
    interactiveSection.appendChild(interactiveWrapper);

    // Advanced examples
    const toolCallExample = createTimelineMessage(
      toolCallMessage,
      "Agent Message with Tool Calls",
    );
    const commitExample = createTimelineMessage(
      commitMessage,
      "Agent Message with Git Commits",
    );
    const longMessageExample = createTimelineMessage(
      longTimelineMessage,
      "Long Message with Complex Markdown",
    );

    advancedSection.appendChild(toolCallExample);
    advancedSection.appendChild(commitExample);
    advancedSection.appendChild(longMessageExample);

    // Event listeners for commit interactions
    container.addEventListener("show-commit-diff", (event: any) => {
      const commitHash = event.detail.commitHash;
      alert(`Commit diff requested for: ${commitHash}`);
    });

    // Assemble the demo
    container.appendChild(messageTypesSection);
    container.appendChild(interactiveSection);
    container.appendChild(advancedSection);

    // Add demo-specific styles
    const demoStyles = document.createElement("style");
    demoStyles.textContent = `
      /* Demo-specific enhancements */
      .demo-container sketch-timeline-message {
        max-width: 100%;
      }

      /* Ensure proper spacing for demo layout */
      .demo-section {
        margin-bottom: 30px;
      }
    `;
    document.head.appendChild(demoStyles);
  },

  cleanup: async () => {
    // Remove demo-specific styles
    const demoStyles = document.querySelector(
      'style[data-demo="timeline-message"]',
    );
    if (demoStyles) {
      demoStyles.remove();
    }
  },
};

export default demo;
