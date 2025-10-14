import { DemoModule } from "./demo-framework/types";
import { demoUtils, sampleTimelineMessages } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Mobile Shell Demo",
  description:
    "Complete mobile interface with chat, diff view, and data management",
  imports: ["../mobile-shell.ts"],

  customStyles: `
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
      height: 100vh;
      overflow: hidden;
    }
    .mobile-demo-container {
      max-width: 375px;
      height: 667px; /* iPhone 8 height */
      margin: 20px auto;
      border: 2px solid #333;
      border-radius: 20px;
      overflow: hidden;
      background: black;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      position: relative;
    }
    .mobile-demo-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 4px;
      background: #333;
      border-radius: 0 0 4px 4px;
      z-index: 1000;
    }
    .demo-controls {
      max-width: 375px;
      margin: 0 auto 20px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .status-indicator {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 8px;
    }
    .status-connected { background: #e8f5e8; color: #2d7d32; }
    .status-connecting { background: #fff3e0; color: #f57c00; }
    .status-disconnected { background: #ffebee; color: #d32f2f; }
  `,

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "Mobile Shell Interface",
      "Complete mobile chat interface with realistic mobile device frame",
    );

    // Create mobile device frame
    const mobileFrame = document.createElement("div");
    mobileFrame.className = "mobile-demo-container";

    // Create the mobile shell element
    const mobileShell = document.createElement("mobile-shell") as any;
    mobileShell.style.height = "100%";

    // Set initial messages
    setTimeout(() => {
      mobileShell.messages = sampleTimelineMessages;
    }, 100);

    mobileFrame.appendChild(mobileShell);
    section.appendChild(mobileFrame);

    // Demo controls
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "demo-controls";

    // Connection status controls
    const statusDisplay = document.createElement("span");
    statusDisplay.innerHTML =
      "Status: <span class='status-indicator status-disconnected'>Disconnected</span>";

    const connectButton = demoUtils.createButton("Connect", () => {
      mobileShell.connectionStatus = "connecting";
      statusDisplay.innerHTML =
        "Status: <span class='status-indicator status-connecting'>Connecting...</span>";

      setTimeout(() => {
        mobileShell.connectionStatus = "connected";
        statusDisplay.innerHTML =
          "Status: <span class='status-indicator status-connected'>Connected</span>";
        connectButton.textContent = "Disconnect";
        const originalConnectHandler = connectButton.onclick;
        connectButton.onclick = () => {
          mobileShell.connectionStatus = "disconnected";
          statusDisplay.innerHTML =
            "Status: <span class='status-indicator status-disconnected'>Disconnected</span>";
          connectButton.textContent = "Connect";
          connectButton.onclick = originalConnectHandler;
        };
      }, 1500);
    });

    // Thinking state toggle
    const thinkingButton = demoUtils.createButton("Toggle Thinking", () => {
      const currentState = mobileShell.state || {
        outstanding_llm_calls: 0,
        outstanding_tool_calls: [],
      };
      const isThinking = currentState.outstanding_llm_calls > 0;

      mobileShell.state = {
        ...currentState,
        outstanding_llm_calls: isThinking ? 0 : 1,
        slug: "demo-session",
        skaband_addr: "https://sketch.dev",
      };

      thinkingButton.textContent = isThinking
        ? "Start Thinking"
        : "Stop Thinking";
    });

    // Add new message
    let messageId = sampleTimelineMessages.length + 1;
    const addMessageButton = demoUtils.createButton("Add Message", () => {
      const newMessage = {
        id: messageId.toString(),
        type: Math.random() > 0.5 ? "user" : ("agent" as "user" | "agent"),
        content: `Demo message ${messageId} - ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toISOString(),
      };

      mobileShell.messages = [...(mobileShell.messages || []), newMessage];
      messageId++;
    });

    // Clear messages
    const clearButton = demoUtils.createButton("Clear Messages", () => {
      mobileShell.messages = [];
      messageId = 1;
    });

    controlsContainer.appendChild(statusDisplay);
    controlsContainer.appendChild(connectButton);
    controlsContainer.appendChild(thinkingButton);
    controlsContainer.appendChild(addMessageButton);
    controlsContainer.appendChild(clearButton);

    container.appendChild(controlsContainer);
    container.appendChild(section);

    // Features section
    const featuresSection = demoUtils.createDemoSection(
      "Features",
      "Key features of the mobile shell interface",
    );

    const featuresList = document.createElement("ul");
    featuresList.style.cssText =
      "margin: 0; padding-left: 20px; line-height: 1.8;";
    featuresList.innerHTML = `
      <li><strong>Full-height mobile layout:</strong> Uses dvh and safe-area-inset for proper mobile display</li>
      <li><strong>Data management:</strong> Connects to /stream endpoint for real-time updates</li>
      <li><strong>Connection status:</strong> Visual indicators for connected/connecting/disconnected states</li>
      <li><strong>Thinking indicator:</strong> Shows when AI is processing with animated dots</li>
      <li><strong>View switching:</strong> Toggle between Chat and Diff views</li>
      <li><strong>Message aggregation:</strong> Efficiently handles streaming message updates</li>
      <li><strong>Touch-optimized:</strong> Designed for mobile touch interactions</li>
    `;
    featuresSection.appendChild(featuresList);

    // Technical details
    const techSection = demoUtils.createDemoSection(
      "Technical Details",
      "Implementation details and architecture",
    );

    const techList = document.createElement("ul");
    techList.style.cssText = "margin: 0; padding-left: 20px; line-height: 1.8;";
    techList.innerHTML = `
      <li><strong>DataManager integration:</strong> Handles WebSocket connections and data streaming</li>
      <li><strong>Event-driven architecture:</strong> Responds to connection and data change events</li>
      <li><strong>Message aggregation:</strong> Uses aggregateAgentMessages for efficient updates</li>
      <li><strong>Component composition:</strong> Combines mobile-title, mobile-chat, mobile-chat-input, mobile-diff</li>
      <li><strong>State management:</strong> Manages connection status, messages, and UI state</li>
      <li><strong>Mobile viewport handling:</strong> Proper safe area and viewport height handling</li>
    `;
    techSection.appendChild(techList);

    container.appendChild(featuresSection);
    container.appendChild(techSection);
  },
};

export default demo;
