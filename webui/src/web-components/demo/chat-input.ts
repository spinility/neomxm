/**
 * Demo fixture for sketch-chat-input component
 */

import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Chat Input Component",
  description: "Chat input with file upload and drag-and-drop support",
  imports: ["../sketch-chat-input"],

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const basicSection = demoUtils.createDemoSection(
      "Basic Chat Input",
      "Type a message and press Enter or click Send. Supports file drag-and-drop.",
    );

    const messagesSection = demoUtils.createDemoSection(
      "Chat Messages",
      "Sent messages will appear here",
    );

    // Create messages display
    const messagesDiv = document.createElement("div");
    messagesDiv.id = "chat-messages";
    messagesDiv.className =
      "min-h-[100px] max-h-[200px] overflow-y-auto border border-gray-300 dark:border-neutral-600 rounded-md p-3 mb-3 bg-gray-50 dark:bg-neutral-900";

    // Create chat input
    const chatInput = document.createElement("sketch-chat-input") as any;

    // Add message display function
    const addMessage = (
      message: string,
      isUser: boolean = true,
      timestamp?: Date,
    ) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = `p-2 my-1 rounded max-w-xs ${
        isUser
          ? "bg-blue-500 text-white ml-auto"
          : "bg-gray-200 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 mr-auto"
      }`;

      const timeStr = timestamp
        ? timestamp.toLocaleTimeString()
        : new Date().toLocaleTimeString();
      messageDiv.innerHTML = `
        <div class="text-sm">${message}</div>
        <div class="text-xs opacity-70 mt-1">${timeStr}</div>
      `;

      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    // Handle send events
    chatInput.addEventListener("send-chat", (evt: any) => {
      const message = evt.detail.message;
      if (message.trim()) {
        addMessage(message, true);

        // Simulate bot response after a delay
        setTimeout(() => {
          const responses = [
            "Message received!",
            "Thanks for sharing that.",
            "I see you uploaded a file.",
            "Processing your request...",
            "How can I help you further?",
          ];
          const randomResponse =
            responses[Math.floor(Math.random() * responses.length)];
          addMessage(randomResponse, false);
        }, 1500);
      }
    });

    // Add initial messages
    addMessage("Welcome to the chat input demo!", false);
    addMessage("Try typing a message or dragging files here.", false);

    // Control buttons
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "mt-4 space-x-2";

    const clearButton = demoUtils.createButton("Clear Chat", () => {
      messagesDiv.innerHTML = "";
      addMessage("Chat cleared!", false);
    });

    const presetButton = demoUtils.createButton("Load Sample Message", () => {
      chatInput.content =
        "I need help with implementing a file upload feature. Can you review the attached screenshot?";
    });

    const multilineButton = demoUtils.createButton("Multiline Message", () => {
      chatInput.content =
        "Here's a multiline message:\n\n1. First point\n2. Second point\n3. Third point\n\nWhat do you think?";
    });

    controlsDiv.appendChild(clearButton);
    controlsDiv.appendChild(presetButton);
    controlsDiv.appendChild(multilineButton);

    // File upload status section
    const statusSection = demoUtils.createDemoSection(
      "Upload Status",
      "Current upload status and file handling",
    );

    const statusDiv = document.createElement("div");
    statusDiv.className =
      "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm text-blue-800 dark:text-blue-200";
    statusDiv.innerHTML = `
      <div>✓ Drag and drop files onto the chat input</div>
      <div>✓ Paste images from clipboard</div>
      <div>✓ Multiple file uploads supported</div>
      <div>✓ Upload progress indication</div>
    `;

    statusSection.appendChild(statusDiv);

    // Assemble the demo
    messagesSection.appendChild(messagesDiv);
    basicSection.appendChild(chatInput);
    basicSection.appendChild(controlsDiv);

    container.appendChild(messagesSection);
    container.appendChild(basicSection);
    container.appendChild(statusSection);
  },
};

export default demo;
