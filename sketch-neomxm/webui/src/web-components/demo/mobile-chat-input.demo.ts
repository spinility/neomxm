import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Mobile Chat Input Demo",
  description:
    "Touch-friendly chat input with auto-resize, file upload, and send functionality",
  imports: ["../mobile-chat-input.ts"],

  customStyles: `
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
    }
    .mobile-viewport {
      max-width: 375px;
      margin: 0 auto;
      border: 1px solid #ddd;
      border-radius: 12px;
      overflow: hidden;
      background: white;
    }
    .demo-container {
      height: 200px;
      display: flex;
      flex-direction: column;
      background: #f8f9fa;
    }
    .messages-area {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: white;
    }
    .message-log {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
      padding: 8px;
      background: #f0f0f0;
      border-radius: 8px;
    }
  `,

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "Mobile Chat Input",
      "Mobile-optimized chat input with auto-resize textarea, file paste support, and send button",
    );

    // Create mobile viewport container
    const viewport = document.createElement("div");
    viewport.className = "mobile-viewport";

    const demoContainer = document.createElement("div");
    demoContainer.className = "demo-container";

    // Messages area to show sent messages
    const messagesArea = document.createElement("div");
    messagesArea.className = "messages-area";
    messagesArea.innerHTML =
      "<div style='color: #999; text-align: center; padding: 20px;'>Type a message and press send or Enter</div>";

    // Create the mobile chat input element
    const chatInput = document.createElement("mobile-chat-input") as any;

    // Handle sent messages
    let messageCount = 0;
    chatInput.addEventListener("send-message", (event: CustomEvent) => {
      messageCount++;
      const messageLog = document.createElement("div");
      messageLog.className = "message-log";
      messageLog.innerHTML = `
        <strong>Message ${messageCount}:</strong><br>
        ${event.detail.message.replace(/\n/g, "<br>")}
        <br><small style="color: #999;">${new Date().toLocaleTimeString()}</small>
      `;
      messagesArea.appendChild(messageLog);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    });

    demoContainer.appendChild(messagesArea);
    demoContainer.appendChild(chatInput);
    viewport.appendChild(demoContainer);
    section.appendChild(viewport);

    // Create controls section
    const controlsSection = demoUtils.createDemoSection(
      "Controls",
      "Test different states of the mobile chat input",
    );

    // Disabled state toggle
    const disableButton = demoUtils.createButton("Toggle Disabled", () => {
      chatInput.disabled = !chatInput.disabled;
      disableButton.textContent = chatInput.disabled
        ? "Enable Input"
        : "Toggle Disabled";
    });

    // Clear messages button
    const clearButton = demoUtils.createButton("Clear Messages", () => {
      messagesArea.innerHTML =
        "<div style='color: #999; text-align: center; padding: 20px;'>Messages cleared</div>";
      messageCount = 0;
    });

    controlsSection.appendChild(disableButton);
    controlsSection.appendChild(clearButton);

    container.appendChild(section);
    container.appendChild(controlsSection);

    // Add usage notes
    const notesSection = demoUtils.createDemoSection(
      "Usage Notes",
      "Features and behaviors of the mobile chat input",
    );

    const notesList = document.createElement("ul");
    notesList.style.cssText =
      "margin: 0; padding-left: 20px; line-height: 1.6;";
    notesList.innerHTML = `
      <li><strong>Auto-resize:</strong> Textarea grows as you type (max 120px height)</li>
      <li><strong>Enter key:</strong> Sends message (Shift+Enter for new line)</li>
      <li><strong>File paste:</strong> Paste images/files to upload (simulated)</li>
      <li><strong>Upload state:</strong> Shows progress and disables send during upload</li>
      <li><strong>Safe area:</strong> Respects device safe areas (notches, home indicator)</li>
      <li><strong>Touch optimized:</strong> 16px font size prevents zoom on iOS</li>
    `;

    notesSection.appendChild(notesList);
    container.appendChild(notesSection);
  },
};

export default demo;
