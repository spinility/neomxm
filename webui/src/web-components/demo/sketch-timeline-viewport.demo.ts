import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Sketch Timeline Viewport Demo",
  description:
    "Timeline viewport rendering with memory leak protection and event-driven approach",
  imports: ["../sketch-timeline.ts"],

  customStyles: `
    .demo-container {
      max-width: 800px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      height: 600px;
      display: flex;
      flex-direction: column;
    }
    .demo-header {
      padding: 20px;
      border-bottom: 1px solid var(--demo-border);
      background: var(--demo-fixture-section-bg);
      border-radius: 8px 8px 0 0;
    }
    .demo-timeline {
      flex: 1;
      overflow: hidden;
    }
    .controls {
      padding: 10px 20px;
      border-top: 1px solid var(--demo-border);
      background: var(--demo-fixture-section-bg);
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
    }
    button:hover {
      background: #f0f0f0;
    }
    .info {
      font-size: 12px;
      color: var(--demo-secondary-text);
      margin-left: auto;
    }
  `,

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "Timeline Viewport Rendering",
      "Demonstrates viewport-based rendering where only visible messages are rendered. Includes tests for memory leak fixes and race conditions.",
    );

    // Create demo container
    const demoContainer = document.createElement("div");
    demoContainer.className = "demo-container";

    // Create header
    const demoHeader = document.createElement("div");
    demoHeader.className = "demo-header";
    demoHeader.innerHTML = `
      <h1>Sketch Timeline Viewport Rendering Demo</h1>
      <p>
        This demo shows how the timeline only renders messages in the
        viewport. Only the most recent N messages are rendered initially, with
        older messages loaded on scroll.
      </p>
    `;

    // Create timeline container
    const demoTimeline = document.createElement("div");
    demoTimeline.className = "demo-timeline";

    // Create the timeline component
    const timeline = document.createElement("sketch-timeline") as any;
    timeline.id = "timeline";
    timeline.initialMessageCount = 20;
    timeline.loadChunkSize = 10;

    demoTimeline.appendChild(timeline);

    // Create controls
    const controls = document.createElement("div");
    controls.className = "controls";

    const info = document.createElement("span");
    info.className = "info";
    info.id = "info";
    info.textContent = "Ready";

    // Helper functions
    const setupScrollContainer = () => {
      const scrollContainer = timeline.querySelector("#scroll-container");
      if (scrollContainer) {
        timeline.scrollContainer = { value: scrollContainer };
        console.log("Scroll container set up:", scrollContainer);
        return true;
      }
      return false;
    };

    const waitForShadowDOM = () => {
      if (setupScrollContainer()) {
        return;
      }

      const observer = new MutationObserver(() => {
        observer.disconnect();
        timeline.updateComplete.then(() => {
          setupScrollContainer();
        });
      });

      observer.observe(timeline, { childList: true, subtree: true });

      timeline.updateComplete.then(() => {
        if (!timeline.scrollContainer || !timeline.scrollContainer.value) {
          setupScrollContainer();
        }
      });
    };

    const generateMessages = (count: number) => {
      const messages = [];
      for (let i = 0; i < count; i++) {
        messages.push({
          type: i % 3 === 0 ? "user" : "agent",
          end_of_turn: true,
          content: `Message ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.`,
          timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
          conversation_id: "demo-conversation",
          idx: i,
        });
      }

      timeline.messages = messages;
      timeline.resetViewport();

      timeline.updateComplete.then(() => {
        const showing = Math.min(count, timeline.initialMessageCount);
        const expectedFirst = Math.max(1, count - showing + 1);
        const expectedLast = count;
        info.textContent = `${count} total messages, showing most recent ${showing} (messages ${expectedFirst}-${expectedLast})`;

        if (!timeline.scrollContainer || !timeline.scrollContainer.value) {
          setupScrollContainer();
        }
      });
    };

    // Create control buttons
    const btn50 = demoUtils.createButton("50 Messages", () =>
      generateMessages(50),
    );
    const btn100 = demoUtils.createButton("100 Messages", () =>
      generateMessages(100),
    );
    const btn500 = demoUtils.createButton("500 Messages", () =>
      generateMessages(500),
    );
    const btnClear = demoUtils.createButton("Clear", () => {
      timeline.messages = [];
      timeline.updateComplete.then(() => {
        info.textContent = "Messages cleared";
      });
    });
    const btnReset = demoUtils.createButton("Reset Viewport", () => {
      timeline.resetViewport();
      info.textContent = "Viewport reset to most recent messages";
    });
    const btnMemoryTest = demoUtils.createButton("Test Memory Leak Fix", () => {
      let cleanupCount = 0;
      const originalRemoveEventListener =
        HTMLElement.prototype.removeEventListener;
      HTMLElement.prototype.removeEventListener = function (
        type: string,
        listener: any,
      ) {
        if (type === "scroll") {
          cleanupCount++;
          console.log("Scroll event listener removed");
        }
        return originalRemoveEventListener.call(this, type, listener);
      };

      const mockContainer1 = document.createElement("div");
      const mockContainer2 = document.createElement("div");

      timeline.scrollContainer = { value: mockContainer1 };
      timeline.scrollContainer = { value: mockContainer2 };
      timeline.scrollContainer = { value: null };
      timeline.scrollContainer = { value: mockContainer1 };

      if (timeline.removeScrollListener) {
        timeline.removeScrollListener();
      }

      HTMLElement.prototype.removeEventListener = originalRemoveEventListener;
      info.textContent = `Memory leak fix test completed. Cleanup calls: ${cleanupCount}`;
    });

    controls.appendChild(btn50);
    controls.appendChild(btn100);
    controls.appendChild(btn500);
    controls.appendChild(btnClear);
    controls.appendChild(btnReset);
    controls.appendChild(btnMemoryTest);
    controls.appendChild(info);

    // Assemble the demo
    demoContainer.appendChild(demoHeader);
    demoContainer.appendChild(demoTimeline);
    demoContainer.appendChild(controls);

    section.appendChild(demoContainer);
    container.appendChild(section);

    // Initialize
    waitForShadowDOM();

    // Generate initial messages after a brief delay
    setTimeout(() => {
      generateMessages(100);
    }, 100);
  },
};

export default demo;
