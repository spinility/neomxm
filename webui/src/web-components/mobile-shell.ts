import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ConnectionStatus, DataManager } from "../data";
import { AgentMessage, State } from "../types";
import { aggregateAgentMessages } from "./aggregateAgentMessages";
import { SketchTailwindElement } from "./sketch-tailwind-element";

import "./mobile-title";
import "./mobile-chat";
import "./mobile-chat-input";
import "./mobile-diff";

@customElement("mobile-shell")
export class MobileShell extends SketchTailwindElement {
  private dataManager = new DataManager();

  @state()
  state: State | null = null;

  @property({ attribute: false })
  messages: AgentMessage[] = [];

  @state()
  connectionStatus: ConnectionStatus = "disconnected";

  @state()
  currentView: "chat" | "diff" = "chat";

  connectedCallback() {
    super.connectedCallback();
    this.setupDataManager();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Remove event listeners
    this.dataManager.removeEventListener(
      "dataChanged",
      this.handleDataChanged.bind(this),
    );
    this.dataManager.removeEventListener(
      "connectionStatusChanged",
      this.handleConnectionStatusChanged.bind(this),
    );
  }

  private setupDataManager() {
    // Add event listeners
    this.dataManager.addEventListener(
      "dataChanged",
      this.handleDataChanged.bind(this),
    );
    this.dataManager.addEventListener(
      "connectionStatusChanged",
      this.handleConnectionStatusChanged.bind(this),
    );

    // Initialize the data manager - it will automatically connect to /stream?from=0
    this.dataManager.initialize();
  }

  private handleDataChanged(eventData: {
    state: State;
    newMessages: AgentMessage[];
  }) {
    const { state, newMessages } = eventData;

    if (state) {
      this.state = state;
    }

    // Update messages using the same pattern as main app shell
    this.messages = aggregateAgentMessages(this.messages, newMessages);
  }

  private handleConnectionStatusChanged(
    status: ConnectionStatus,
    _errorMessage?: string,
  ) {
    this.connectionStatus = status;
  }

  private handleSendMessage = async (
    event: CustomEvent<{ message: string }>,
  ) => {
    const message = event.detail.message.trim();
    if (!message) {
      return;
    }

    try {
      // Send the message to the server
      const response = await fetch("chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        console.error("Failed to send message:", response.statusText);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  private handleViewChange = (
    event: CustomEvent<{ view: "chat" | "diff" }>,
  ) => {
    this.currentView = event.detail.view;
  };

  render() {
    const isThinking =
      this.state?.outstanding_llm_calls > 0 ||
      (this.state?.outstanding_tool_calls?.length ?? 0) > 0;

    return html`
      <div
        class="flex flex-col bg-white dark:bg-neutral-800 font-sans w-screen overflow-hidden"
        style="height: 100dvh; height: 100vh; height: calc(var(--vh, 1vh) * 100); min-height: 100vh; min-height: -webkit-fill-available;"
      >
        <mobile-title
          class="flex-shrink-0"
          .connectionStatus=${this.connectionStatus}
          .isThinking=${isThinking}
          .skabandAddr=${this.state?.skaband_addr}
          .currentView=${this.currentView}
          .slug=${this.state?.slug || ""}
          @view-change=${this.handleViewChange}
        ></mobile-title>

        ${this.currentView === "chat"
          ? html`
              <mobile-chat
                class="flex-1 overflow-hidden min-h-0"
                .messages=${this.messages}
                .isThinking=${isThinking}
              ></mobile-chat>
            `
          : html`<mobile-diff
              class="flex-1 overflow-hidden min-h-0"
            ></mobile-diff>`}

        <mobile-chat-input
          class="flex-shrink-0 min-h-[64px]"
          .disabled=${this.connectionStatus !== "connected"}
          @send-message=${this.handleSendMessage}
        ></mobile-chat-input>
      </div>
    `;
  }
}
