/**
 * Demo module for sketch-timeline component
 */

import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";
import type { AgentMessage } from "../../types";

// Mock messages for demo
function createMockMessage(props: Partial<AgentMessage> = {}): AgentMessage {
  return {
    idx: props.idx || 0,
    type: props.type || "agent",
    content: props.content || "Hello world",
    timestamp: props.timestamp || "2023-05-15T12:00:00Z",
    elapsed: props.elapsed || 1500000000, // 1.5 seconds in nanoseconds
    end_of_turn: props.end_of_turn || false,
    conversation_id: props.conversation_id || "conv123",
    tool_calls: props.tool_calls || [],
    commits: props.commits || undefined,
    usage: props.usage,
    hide_output: props.hide_output || false,
    ...props,
  };
}

function createMockMessages(count: number): AgentMessage[] {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      idx: i,
      content: `Message ${i + 1}: This is a sample message to demonstrate the timeline component.`,
      type: i % 3 === 0 ? "user" : "agent",
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
      tool_calls:
        i % 4 === 0
          ? [
              {
                name: "bash",
                input: `echo "Tool call example ${i}"`,
                tool_call_id: `call_${i}`,
                args: `{"command": "echo 'Tool call example ${i}'"}`,
                result: `Tool call example ${i}`,
              },
            ]
          : [],
      usage:
        i % 5 === 0
          ? {
              input_tokens: 10 + i,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              output_tokens: 50 + i * 2,
              cost_usd: 0.001 * (i + 1),
            }
          : undefined,
    }),
  );
}

const demo: DemoModule = {
  title: "Timeline Demo",
  description:
    "Interactive timeline component for displaying conversation messages with various states",
  imports: ["../sketch-timeline"],
  styles: ["/dist/tailwind.css"],

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const basicSection = demoUtils.createDemoSection(
      "Basic Timeline",
      "Timeline with a few sample messages",
    );

    const statesSection = demoUtils.createDemoSection(
      "Timeline States",
      "Different loading and thinking states",
    );

    const interactiveSection = demoUtils.createDemoSection(
      "Interactive Demo",
      "Add messages and control timeline behavior",
    );

    // Basic timeline with sample messages
    const basicMessages = createMockMessages(5);
    const basicTimeline = document.createElement("sketch-timeline") as any;
    basicTimeline.messages = basicMessages;
    basicTimeline.style.cssText =
      "height: 400px; border: 1px solid #e1e5e9; border-radius: 6px; margin: 10px 0;";

    // Create a scroll container for the basic timeline
    const basicScrollContainer = document.createElement("div");
    basicScrollContainer.style.cssText = "height: 400px; overflow-y: auto;";
    basicScrollContainer.appendChild(basicTimeline);
    basicTimeline.scrollContainer = { value: basicScrollContainer };

    basicSection.appendChild(basicScrollContainer);

    // Timeline with loading state
    const loadingTimeline = document.createElement("sketch-timeline") as any;
    loadingTimeline.messages = [];
    loadingTimeline.isLoadingOlderMessages = false;
    loadingTimeline.style.cssText =
      "height: 200px; border: 1px solid #e1e5e9; border-radius: 6px; margin: 10px 0;";

    const loadingWrapper = document.createElement("div");
    loadingWrapper.style.cssText = "margin: 15px 0;";

    const loadingLabel = document.createElement("h4");
    loadingLabel.textContent = "Loading State (No messages)";
    loadingLabel.style.cssText =
      "margin: 0 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

    loadingWrapper.appendChild(loadingLabel);
    loadingWrapper.appendChild(loadingTimeline);
    statesSection.appendChild(loadingWrapper);

    // Timeline with thinking state
    const thinkingMessages = createMockMessages(3);
    const thinkingTimeline = document.createElement("sketch-timeline") as any;
    thinkingTimeline.messages = thinkingMessages;
    thinkingTimeline.llmCalls = 2;
    thinkingTimeline.toolCalls = ["bash", "patch"];
    thinkingTimeline.agentState = "thinking";
    thinkingTimeline.style.cssText =
      "height: 300px; border: 1px solid #e1e5e9; border-radius: 6px; margin: 10px 0;";

    // Set initial load complete for thinking timeline
    setTimeout(() => {
      (thinkingTimeline as any).isInitialLoadComplete = true;
      thinkingTimeline.requestUpdate();
    }, 100);

    const thinkingWrapper = document.createElement("div");
    thinkingWrapper.style.cssText = "margin: 15px 0;";

    const thinkingLabel = document.createElement("h4");
    thinkingLabel.textContent = "Thinking State (Agent is active)";
    thinkingLabel.style.cssText =
      "margin: 0 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

    const thinkingScrollContainer = document.createElement("div");
    thinkingScrollContainer.style.cssText = "height: 300px; overflow-y: auto;";
    thinkingScrollContainer.appendChild(thinkingTimeline);
    thinkingTimeline.scrollContainer = { value: thinkingScrollContainer };

    thinkingWrapper.appendChild(thinkingLabel);
    thinkingWrapper.appendChild(thinkingScrollContainer);
    statesSection.appendChild(thinkingWrapper);

    // Interactive timeline
    const interactiveMessages = createMockMessages(8);
    const interactiveTimeline = document.createElement(
      "sketch-timeline",
    ) as any;
    interactiveTimeline.messages = interactiveMessages;
    interactiveTimeline.style.cssText =
      "height: 400px; border: 1px solid #e1e5e9; border-radius: 6px; margin: 10px 0;";

    // Set initial load complete for interactive timeline
    setTimeout(() => {
      (interactiveTimeline as any).isInitialLoadComplete = true;
      interactiveTimeline.requestUpdate();
    }, 100);

    const interactiveScrollContainer = document.createElement("div");
    interactiveScrollContainer.style.cssText =
      "height: 400px; overflow-y: auto;";
    interactiveScrollContainer.appendChild(interactiveTimeline);
    interactiveTimeline.scrollContainer = { value: interactiveScrollContainer };

    // Control buttons for interactive demo
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText =
      "margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px;";

    const addMessageButton = demoUtils.createButton("Add User Message", () => {
      const newMessage = createMockMessage({
        idx: interactiveMessages.length,
        content: `New user message added at ${new Date().toLocaleTimeString()}`,
        type: "user",
        timestamp: new Date().toISOString(),
      });
      interactiveMessages.push(newMessage);
      interactiveTimeline.messages = [...interactiveMessages];
    });

    const addAgentMessageButton = demoUtils.createButton(
      "Add Agent Message",
      () => {
        const newMessage = createMockMessage({
          idx: interactiveMessages.length,
          content: `New agent response added at ${new Date().toLocaleTimeString()}`,
          type: "agent",
          timestamp: new Date().toISOString(),
          tool_calls:
            Math.random() > 0.5
              ? [
                  {
                    name: "bash",
                    input: "date",
                    tool_call_id: `call_${Date.now()}`,
                    args: '{"command": "date"}',
                    result: new Date().toString(),
                  },
                ]
              : [],
        });
        interactiveMessages.push(newMessage);
        interactiveTimeline.messages = [...interactiveMessages];
      },
    );

    const toggleThinkingButton = demoUtils.createButton(
      "Toggle Thinking",
      () => {
        if (
          interactiveTimeline.llmCalls > 0 ||
          interactiveTimeline.toolCalls.length > 0
        ) {
          interactiveTimeline.llmCalls = 0;
          interactiveTimeline.toolCalls = [];
        } else {
          interactiveTimeline.llmCalls = 1;
          interactiveTimeline.toolCalls = ["bash"];
        }
      },
    );

    const toggleCompactButton = demoUtils.createButton(
      "Toggle Compact Padding",
      () => {
        interactiveTimeline.compactPadding =
          !interactiveTimeline.compactPadding;
      },
    );

    const clearMessagesButton = demoUtils.createButton("Clear Messages", () => {
      interactiveMessages.length = 0;
      interactiveTimeline.messages = [];
    });

    const resetDemoButton = demoUtils.createButton("Reset Demo", () => {
      interactiveMessages.length = 0;
      interactiveMessages.push(...createMockMessages(8));
      interactiveTimeline.messages = [...interactiveMessages];
      interactiveTimeline.llmCalls = 0;
      interactiveTimeline.toolCalls = [];
      interactiveTimeline.compactPadding = false;
    });

    controlsDiv.appendChild(addMessageButton);
    controlsDiv.appendChild(addAgentMessageButton);
    controlsDiv.appendChild(toggleThinkingButton);
    controlsDiv.appendChild(toggleCompactButton);
    controlsDiv.appendChild(clearMessagesButton);
    controlsDiv.appendChild(resetDemoButton);

    const interactiveWrapper = document.createElement("div");
    interactiveWrapper.style.cssText =
      "padding: 10px; border: 1px solid #e1e5e9; border-radius: 6px; background: white;";
    interactiveWrapper.appendChild(interactiveScrollContainer);
    interactiveWrapper.appendChild(controlsDiv);
    interactiveSection.appendChild(interactiveWrapper);

    // Set initial load complete for basic timeline
    setTimeout(() => {
      (basicTimeline as any).isInitialLoadComplete = true;
      basicTimeline.requestUpdate();
    }, 100);

    // Assemble the demo
    container.appendChild(basicSection);
    container.appendChild(statesSection);
    container.appendChild(interactiveSection);

    // Store references for cleanup
    (container as any).timelines = [
      basicTimeline,
      loadingTimeline,
      thinkingTimeline,
      interactiveTimeline,
    ];
  },

  cleanup: async () => {
    // Clean up any timers or listeners if needed
    const container = document.getElementById("demo-container");
    if (container && (container as any).timelines) {
      const timelines = (container as any).timelines;
      timelines.forEach((timeline: any) => {
        // Reset timeline state
        timeline.llmCalls = 0;
        timeline.toolCalls = [];
        timeline.messages = [];
      });
      delete (container as any).timelines;
    }
  },
};

export default demo;
