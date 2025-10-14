import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ConnectionStatus } from "../data";
import { SketchTailwindElement } from "./sketch-tailwind-element";

@customElement("mobile-title")
export class MobileTitle extends SketchTailwindElement {
  @property({ type: String })
  connectionStatus: ConnectionStatus = "disconnected";

  @property({ type: Boolean })
  isThinking = false;

  @property({ type: String })
  skabandAddr?: string;

  @property({ type: String })
  currentView: "chat" | "diff" = "chat";

  @property({ type: String })
  slug: string = "";

  connectedCallback() {
    super.connectedCallback();
    // Add animation styles to document head if not already present
    if (!document.getElementById("mobile-title-animations")) {
      const style = document.createElement("style");
      style.id = "mobile-title-animations";
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes thinking {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .pulse-animation { animation: pulse 1.5s ease-in-out infinite; }
        .thinking-animation { animation: thinking 1.4s ease-in-out infinite both; }
        .thinking-animation:nth-child(1) { animation-delay: -0.32s; }
        .thinking-animation:nth-child(2) { animation-delay: -0.16s; }
        .thinking-animation:nth-child(3) { animation-delay: 0; }
      `;
      document.head.appendChild(style);
    }
  }

  private getStatusText() {
    switch (this.connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
    }
  }

  private handleViewChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const view = select.value as "chat" | "diff";
    if (view !== this.currentView) {
      const changeEvent = new CustomEvent("view-change", {
        detail: { view },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(changeEvent);
    }
  }

  render() {
    const statusDotClass =
      {
        connected: "bg-green-500",
        connecting: "bg-yellow-500 pulse-animation",
        disconnected: "bg-red-500",
      }[this.connectionStatus] || "bg-gray-500";

    return html`
      <div
        class="block bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-gray-800 p-3"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h1
              class="text-lg font-semibold text-gray-900 dark:text-gray-100 m-0"
            >
              ${this.skabandAddr
                ? html`<a
                    href="${this.skabandAddr}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-inherit no-underline transition-opacity duration-200 flex items-center gap-2 hover:opacity-80 hover:underline"
                  >
                    <img
                      src="${this.skabandAddr}/sketch.dev.png"
                      alt="sketch"
                      class="w-[18px] h-[18px] rounded"
                    />
                    ${this.slug || "Sketch"}
                  </a>`
                : html`${this.slug || "Sketch"}`}
            </h1>
          </div>

          <div class="flex items-center gap-3">
            <select
              class="bg-transparent border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 text-sm font-medium cursor-pointer transition-all duration-200 text-gray-700 dark:text-gray-100 min-w-[60px] hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:shadow-sm focus:ring-2 focus:ring-blue-200"
              .value=${this.currentView}
              @change=${this.handleViewChange}
            >
              <option value="chat">Chat</option>
              <option value="diff">Diff</option>
            </select>

            ${this.isThinking
              ? html`
                  <div
                    class="flex items-center gap-1.5 text-gray-500 dark:text-gray-300 text-xs"
                  >
                    <span>thinking</span>
                    <div class="flex gap-0.5">
                      <div
                        class="w-1 h-1 rounded-full bg-gray-500 dark:bg-neutral-400 thinking-animation"
                      ></div>
                      <div
                        class="w-1 h-1 rounded-full bg-gray-500 dark:bg-neutral-400 thinking-animation"
                      ></div>
                      <div
                        class="w-1 h-1 rounded-full bg-gray-500 dark:bg-neutral-400 thinking-animation"
                      ></div>
                    </div>
                  </div>
                `
              : html`<span
                  class="w-2 h-2 rounded-full flex-shrink-0 ${statusDotClass}"
                ></span>`}
          </div>
        </div>
      </div>
    `;
  }
}
