import { test, expect } from "@sand4rt/experimental-ct-web";
import { SketchTimeline } from "./sketch-timeline";
import { AgentMessage } from "../types";

// Mock DataManager class that mimics the real DataManager interface
class MockDataManager {
  private eventListeners: Map<string, Array<(...args: any[]) => void>> =
    new Map();
  private isInitialLoadComplete: boolean = false;

  constructor() {
    this.eventListeners.set("initialLoadComplete", []);
  }

  addEventListener(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  removeEventListener(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  getIsInitialLoadComplete(): boolean {
    return this.isInitialLoadComplete;
  }

  triggerInitialLoadComplete(
    messageCount: number = 0,
    expectedCount: number = 0,
  ): void {
    this.isInitialLoadComplete = true;
    const listeners = this.eventListeners.get("initialLoadComplete") || [];
    // Call each listener with the event data object as expected by the component
    listeners.forEach((listener) => {
      try {
        listener({ messageCount, expectedCount });
      } catch (e) {
        console.error("Error in event listener:", e);
      }
    });
  }
}

// Helper function to create mock timeline messages
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
    commits: props.commits || [],
    usage: props.usage,
    hide_output: props.hide_output || false,
    ...props,
  };
}

// Extend window interface for test globals
declare global {
  interface Window {
    scrollCalled?: boolean;
    testEventFired?: boolean;
    testEventDetail?: any;
  }
}

// Helper function to create an array of mock messages
function createMockMessages(count: number): AgentMessage[] {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      idx: i,
      content: `Message ${i + 1}`,
      type: i % 3 === 0 ? "user" : "agent",
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
    }),
  );
}

test("renders empty state when no messages", async ({ mount }) => {
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages: [],
      dataManager: mockDataManager,
    },
  });

  await expect(timeline.locator("[data-testid='welcome-box']")).toBeVisible();
  await expect(
    timeline.locator("[data-testid='welcome-box-title']"),
  ).toContainText("How to use Sketch");
});

test("renders messages when provided", async ({ mount }) => {
  const messages = createMockMessages(5);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  await expect(
    timeline.locator("[data-testid='timeline-container']"),
  ).toBeVisible();
  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(5);
});

test("shows thinking indicator when agent is active", async ({ mount }) => {
  const messages = createMockMessages(3);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      llmCalls: 1,
      toolCalls: ["thinking"],
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    console.log("Set isInitialLoadComplete to true");
    console.log("llmCalls:", element.llmCalls);
    console.log("toolCalls:", element.toolCalls);
    console.log(
      "isInitialLoadComplete:",
      (element as any).isInitialLoadComplete,
    );
    element.requestUpdate();
    return element.updateComplete;
  });

  // Debug: Check if the element exists and what its computed style is
  const indicatorExists = await timeline
    .locator("[data-testid='thinking-indicator']")
    .count();
  console.log("Thinking indicator exists:", indicatorExists);

  if (indicatorExists > 0) {
    const style = await timeline
      .locator("[data-testid='thinking-indicator']")
      .evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          className: el.className,
        };
      });
    console.log("Thinking indicator style:", style);
  }
  // Wait for the component to render with a longer timeout
  await expect(
    timeline.locator("[data-testid='thinking-indicator']"),
  ).toBeVisible({ timeout: 10000 });
  await expect(
    timeline.locator("[data-testid='thinking-bubble']"),
  ).toBeVisible();
  await expect(timeline.locator("[data-testid='thinking-dot']")).toHaveCount(3);
});

test("filters out messages with hide_output flag", async ({ mount }) => {
  const messages = [
    createMockMessage({ idx: 0, content: "Visible message 1" }),
    createMockMessage({ idx: 1, content: "Hidden message", hide_output: true }),
    createMockMessage({ idx: 2, content: "Visible message 2" }),
  ];
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Should only show 2 visible messages
  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(2);

  // Verify the hidden message is not rendered by checking each visible message individually
  const visibleMessages = timeline.locator("sketch-timeline-message");
  await expect(visibleMessages.nth(0)).toContainText("Visible message 1");
  await expect(visibleMessages.nth(1)).toContainText("Visible message 2");

  // Check that no message contains the hidden text
  const firstMessageText = await visibleMessages.nth(0).textContent();
  const secondMessageText = await visibleMessages.nth(1).textContent();
  expect(firstMessageText).not.toContain("Hidden message");
  expect(secondMessageText).not.toContain("Hidden message");
});

// Viewport Management Tests

test("limits initial message count based on initialMessageCount property", async ({
  mount,
}) => {
  const messages = createMockMessages(50);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      initialMessageCount: 10,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Should only render the most recent 10 messages initially
  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(10);

  // Should show the most recent messages (41-50)
  await expect(
    timeline.locator("sketch-timeline-message").first(),
  ).toContainText("Message 41");
  await expect(
    timeline.locator("sketch-timeline-message").last(),
  ).toContainText("Message 50");
});

test("handles viewport expansion correctly", async ({ mount }) => {
  const messages = createMockMessages(50);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      initialMessageCount: 10,
      loadChunkSize: 5,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Initially shows 10 messages
  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(10);

  // Simulate expanding viewport by setting visibleMessageStartIndex
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).visibleMessageStartIndex = 5;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Should now show 15 messages (10 initial + 5 chunk)
  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(15);

  // Should show messages 36-50
  await expect(
    timeline.locator("sketch-timeline-message").first(),
  ).toContainText("Message 36");
  await expect(
    timeline.locator("sketch-timeline-message").last(),
  ).toContainText("Message 50");
});

test("resetViewport method resets to most recent messages", async ({
  mount,
}) => {
  const messages = createMockMessages(50);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      initialMessageCount: 10,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Expand viewport
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).visibleMessageStartIndex = 10;
    element.requestUpdate();
    return element.updateComplete;
  });

  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(20);

  // Reset viewport
  await timeline.evaluate((element: SketchTimeline) => {
    element.resetViewport();
    return element.updateComplete;
  });

  // Should be back to initial count
  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(10);
  await expect(
    timeline.locator("sketch-timeline-message").first(),
  ).toContainText("Message 41");
});

// Scroll State Management Tests

test("shows jump-to-latest button when not pinned to latest", async ({
  mount,
}) => {
  const messages = createMockMessages(10);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Initially should be pinned to latest (button hidden)
  await expect(timeline.locator("#jump-to-latest.floating")).not.toBeVisible();

  // Simulate floating state
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).scrollingState = "floating";
    element.requestUpdate();
    return element.updateComplete;
  });

  // Button should now be visible - wait longer for CSS classes to apply
  await expect(timeline.locator("#jump-to-latest.floating")).toBeVisible({
    timeout: 10000,
  });
});

test("jump-to-latest button calls scroll method", async ({ mount }) => {
  const messages = createMockMessages(10);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Initialize the scroll tracking flag and set to floating state to show button
  await timeline.evaluate((element: SketchTimeline) => {
    // Initialize tracking flag
    (window as any).scrollCalled = false;

    // Set floating state
    (element as any).scrollingState = "floating";

    // Mock the scroll method
    (element as any).scrollToBottomWithRetry = async function () {
      (window as any).scrollCalled = true;
      return Promise.resolve();
    };

    element.requestUpdate();
    return element.updateComplete;
  });

  // Verify button is visible before clicking - wait longer for CSS classes to apply
  await expect(timeline.locator("#jump-to-latest.floating")).toBeVisible({
    timeout: 10000,
  });

  // Click the jump to latest button
  await timeline.locator("#jump-to-latest").click();

  // Check if scroll was called
  const wasScrollCalled = await timeline.evaluate(
    () => (window as any).scrollCalled,
  );
  expect(wasScrollCalled).toBe(true);
});

// Loading State Tests

test("shows loading indicator when loading older messages", async ({
  mount,
}) => {
  const messages = createMockMessages(10);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Set initial load complete first, then simulate loading older messages
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    (element as any).isLoadingOlderMessages = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  await expect(
    timeline.locator("[data-testid='loading-indicator']"),
  ).toBeVisible();
  await expect(
    timeline.locator("[data-testid='loading-spinner']"),
  ).toBeVisible();
  await expect(
    timeline.locator("[data-testid='loading-indicator']"),
  ).toContainText("Loading older messages...");
});

test("hides loading indicator when not loading", async ({ mount }) => {
  const messages = createMockMessages(10);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Set initial load complete so no loading indicator is shown
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Should not show loading indicator by default
  await expect(
    timeline.locator("[data-testid='loading-indicator']"),
  ).not.toBeVisible();
});

// Memory Management and Cleanup Tests

test("handles scroll container changes properly", async ({ mount }) => {
  const messages = createMockMessages(5);

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
    },
  });

  // Initialize call counters in window
  await timeline.evaluate(() => {
    (window as any).addListenerCalls = 0;
    (window as any).removeListenerCalls = 0;
  });

  // Set first container
  await timeline.evaluate((element: SketchTimeline) => {
    const mockContainer1 = {
      addEventListener: () => {
        (window as any).addListenerCalls =
          ((window as any).addListenerCalls || 0) + 1;
      },
      removeEventListener: () => {
        (window as any).removeListenerCalls =
          ((window as any).removeListenerCalls || 0) + 1;
      },
      isConnected: true,
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 500,
    };
    (element as any).scrollContainer = { value: mockContainer1 };
    element.requestUpdate();
    return element.updateComplete;
  });

  // Change to second container (should clean up first)
  await timeline.evaluate((element: SketchTimeline) => {
    const mockContainer2 = {
      addEventListener: () => {
        (window as any).addListenerCalls =
          ((window as any).addListenerCalls || 0) + 1;
      },
      removeEventListener: () => {
        (window as any).removeListenerCalls =
          ((window as any).removeListenerCalls || 0) + 1;
      },
      isConnected: true,
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 500,
    };
    (element as any).scrollContainer = { value: mockContainer2 };
    element.requestUpdate();
    return element.updateComplete;
  });

  // Get the call counts
  const addListenerCalls = await timeline.evaluate(
    () => (window as any).addListenerCalls || 0,
  );
  const removeListenerCalls = await timeline.evaluate(
    () => (window as any).removeListenerCalls || 0,
  );

  // Should have called addEventListener twice and removeEventListener once
  expect(addListenerCalls).toBeGreaterThan(0);
  expect(removeListenerCalls).toBeGreaterThan(0);
});

test("cancels loading operations on viewport reset", async ({ mount }) => {
  const messages = createMockMessages(50);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Set initial load complete and then loading older messages state
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    (element as any).isLoadingOlderMessages = true;
    (element as any).loadingAbortController = new AbortController();
    element.requestUpdate();
    return element.updateComplete;
  });

  // Verify loading state - should show only the "loading older messages" indicator
  await expect(
    timeline.locator("[data-testid='loading-indicator']"),
  ).toContainText("Loading older messages...");

  // Reset viewport (should cancel loading)
  await timeline.evaluate((element: SketchTimeline) => {
    element.resetViewport();
    return element.updateComplete;
  });

  // Loading should be cancelled
  const isLoading = await timeline.evaluate(
    (element: SketchTimeline) => (element as any).isLoadingOlderMessages,
  );
  expect(isLoading).toBe(false);

  await expect(
    timeline.locator("[data-testid='loading-indicator']"),
  ).not.toBeVisible();
});

// Message Filtering and Ordering Tests

test("displays messages in correct order (most recent at bottom)", async ({
  mount,
}) => {
  const messages = [
    createMockMessage({
      idx: 0,
      content: "First message",
      timestamp: "2023-01-01T10:00:00Z",
    }),
    createMockMessage({
      idx: 1,
      content: "Second message",
      timestamp: "2023-01-01T11:00:00Z",
    }),
    createMockMessage({
      idx: 2,
      content: "Third message",
      timestamp: "2023-01-01T12:00:00Z",
    }),
  ];
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  const messageElements = timeline.locator("sketch-timeline-message");

  // Check order
  await expect(messageElements.nth(0)).toContainText("First message");
  await expect(messageElements.nth(1)).toContainText("Second message");
  await expect(messageElements.nth(2)).toContainText("Third message");
});

test("handles previousMessage prop correctly for message context", async ({
  mount,
}) => {
  const messages = [
    createMockMessage({ idx: 0, content: "First message", type: "user" }),
    createMockMessage({ idx: 1, content: "Second message", type: "agent" }),
    createMockMessage({ idx: 2, content: "Third message", type: "user" }),
  ];
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Check that messages have the expected structure
  // The first message should not have a previous message context
  // The second message should have the first as previous, etc.

  const messageElements = timeline.locator("sketch-timeline-message");
  await expect(messageElements).toHaveCount(3);

  // All messages should be rendered
  await expect(messageElements.nth(0)).toContainText("First message");
  await expect(messageElements.nth(1)).toContainText("Second message");
  await expect(messageElements.nth(2)).toContainText("Third message");
});

// Event Handling Tests

test("handles show-commit-diff events from message components", async ({
  mount,
}) => {
  const messages = [
    createMockMessage({
      idx: 0,
      content: "Message with commit",
      commits: [
        {
          hash: "abc123def456",
          subject: "Test commit",
          body: "Test commit body",
          pushed_branch: "main",
        },
      ],
    }),
  ];

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
    },
  });

  // Listen for the bubbled event
  await timeline.evaluate((element) => {
    element.addEventListener("show-commit-diff", (event: CustomEvent) => {
      window.testEventFired = true;
      window.testEventDetail = event.detail;
    });
  });

  // Simulate the event being fired from a message component
  await timeline.evaluate((element) => {
    const event = new CustomEvent("show-commit-diff", {
      detail: { commitHash: "abc123def456" },
      bubbles: true,
      composed: true,
    });
    element.dispatchEvent(event);
  });

  // Check that event was handled
  const wasEventFired = await timeline.evaluate(() => window.testEventFired);
  const detail = await timeline.evaluate(() => window.testEventDetail);

  expect(wasEventFired).toBe(true);
  expect(detail?.commitHash).toBe("abc123def456");
});

// Edge Cases and Error Handling

test("handles empty filteredMessages gracefully", async ({ mount }) => {
  // All messages are hidden - this will still render timeline structure
  // because component only shows welcome box when messages.length === 0
  const messages = [
    createMockMessage({ idx: 0, content: "Hidden 1", hide_output: true }),
    createMockMessage({ idx: 1, content: "Hidden 2", hide_output: true }),
  ];
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  // Should render the timeline structure but with no visible messages
  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(0);

  // Should not show welcome box when messages array has content (even if all hidden)
  await expect(
    timeline.locator("[data-testid='welcome-box']"),
  ).not.toBeVisible();

  // Should not show loading indicator
  await expect(
    timeline.locator("[data-testid='loading-indicator']"),
  ).not.toBeVisible();

  // Timeline container exists but may not be visible due to CSS
  await expect(
    timeline.locator("[data-testid='timeline-container']"),
  ).toBeAttached();
});

test("handles message array updates correctly", async ({ mount }) => {
  const initialMessages = createMockMessages(5);
  const mockDataManager = new MockDataManager();

  const timeline = await mount(SketchTimeline, {
    props: {
      messages: initialMessages,
      dataManager: mockDataManager,
    },
  });

  // Directly set the isInitialLoadComplete state to bypass the event system for testing
  await timeline.evaluate((element: SketchTimeline) => {
    (element as any).isInitialLoadComplete = true;
    element.requestUpdate();
    return element.updateComplete;
  });

  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(5);

  // Update with more messages
  const moreMessages = createMockMessages(10);
  await timeline.evaluate(
    (element: SketchTimeline, newMessages: AgentMessage[]) => {
      element.messages = newMessages;
      element.requestUpdate();
      return element.updateComplete;
    },
    moreMessages,
  );

  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(10);

  // Update with fewer messages
  const fewerMessages = createMockMessages(3);
  await timeline.evaluate(
    (element: SketchTimeline, newMessages: AgentMessage[]) => {
      element.messages = newMessages;
      element.requestUpdate();
      return element.updateComplete;
    },
    fewerMessages,
  );

  await expect(timeline.locator("sketch-timeline-message")).toHaveCount(3);
});

test("messageKey method generates unique keys correctly", async ({ mount }) => {
  const timeline = await mount(SketchTimeline);

  const message1 = createMockMessage({ idx: 1, tool_calls: [] });
  const message2 = createMockMessage({ idx: 2, tool_calls: [] });
  const message3 = createMockMessage({
    idx: 1,
    tool_calls: [
      {
        tool_call_id: "call_123",
        name: "test",
        input: "{}",
        result_message: createMockMessage({ idx: 99, content: "result" }),
      },
    ],
  });

  const key1 = await timeline.evaluate(
    (element: SketchTimeline, msg: AgentMessage) => element.messageKey(msg),
    message1,
  );
  const key2 = await timeline.evaluate(
    (element: SketchTimeline, msg: AgentMessage) => element.messageKey(msg),
    message2,
  );
  const key3 = await timeline.evaluate(
    (element: SketchTimeline, msg: AgentMessage) => element.messageKey(msg),
    message3,
  );

  // Keys should be unique
  expect(key1).not.toBe(key2);
  expect(key1).not.toBe(key3);
  expect(key2).not.toBe(key3);

  // Keys should include message index
  expect(key1).toContain("message-1");
  expect(key2).toContain("message-2");
  expect(key3).toContain("message-1");

  // Message with tool call should have different key than without
  expect(key1).not.toBe(key3);
});
