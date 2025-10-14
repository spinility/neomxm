import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./sketch-container-status";
import { SketchTailwindElement } from "./sketch-tailwind-element";

@customElement("sketch-view-mode-select")
export class SketchViewModeSelect extends SketchTailwindElement {
  // Current active mode
  @property()
  activeMode: "chat" | "diff2" | "terminal" = "chat";

  // Diff stats
  @property({ type: Number })
  diffLinesAdded: number = 0;

  @property({ type: Number })
  diffLinesRemoved: number = 0;

  // Header bar: view mode buttons

  constructor() {
    super();

    // Binding methods
    this._handleViewModeClick = this._handleViewModeClick.bind(this);
    this._handleUpdateActiveMode = this._handleUpdateActiveMode.bind(this);
  }

  // See https://lit.dev/docs/components/lifecycle/
  connectedCallback() {
    super.connectedCallback();

    // Listen for update-active-mode events
    this.addEventListener(
      "update-active-mode",
      this._handleUpdateActiveMode as EventListener,
    );
  }

  /**
   * Handle view mode button clicks
   */
  private _handleViewModeClick(mode: "chat" | "diff2" | "terminal") {
    // Dispatch a custom event to notify the app shell to change the view
    const event = new CustomEvent("view-mode-select", {
      detail: { mode },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  /**
   * Handle updates to the active mode
   */
  private _handleUpdateActiveMode(event: CustomEvent) {
    const { mode } = event.detail;
    if (mode) {
      this.activeMode = mode;
    }
  }

  // See https://lit.dev/docs/components/lifecycle/
  disconnectedCallback() {
    super.disconnectedCallback();

    // Remove event listeners
    this.removeEventListener(
      "update-active-mode",
      this._handleUpdateActiveMode as EventListener,
    );
  }

  render() {
    return html`
      <div
        class="flex mr-2.5 bg-gray-100 dark:bg-neutral-800 rounded border border-gray-300 dark:border-neutral-600 overflow-hidden"
      >
        <button
          id="showConversationButton"
          class="px-3 py-2 bg-none border-0 border-b-2 cursor-pointer text-xs flex items-center gap-1.5 text-gray-600 dark:text-neutral-400 border-transparent transition-all whitespace-nowrap ${this
            .activeMode === "chat"
            ? "border-b-blue-600 dark:border-b-neutral-500 text-blue-600 font-medium bg-blue-50 dark:bg-neutral-700"
            : "hover:bg-gray-200 dark:hover:bg-neutral-700"} @xl:px-3 @xl:py-2 @max-xl:px-2.5 @max-xl:[&>span:not(.tab-icon):not(.diff-stats)]:hidden @max-xl:[&>.diff-stats]:inline @max-xl:[&>.diff-stats]:text-xs @max-xl:[&>.diff-stats]:ml-0.5 border-r border-gray-200 dark:border-neutral-600 last-of-type:border-r-0"
          title="Conversation View"
          @click=${() => this._handleViewModeClick("chat")}
        >
          <span class="tab-icon text-base">💬</span>
          <span class="max-sm:hidden sm:max-xl:hidden">Chat</span>
        </button>
        <button
          id="showDiff2Button"
          class="px-3 py-2 bg-none border-0 border-b-2 cursor-pointer text-xs flex items-center gap-1.5 text-gray-600 dark:text-neutral-400 border-transparent transition-all whitespace-nowrap ${this
            .activeMode === "diff2"
            ? "border-b-blue-600 dark:border-b-neutral-500 text-blue-600 font-medium bg-blue-50 dark:bg-neutral-700"
            : "hover:bg-gray-200 dark:hover:bg-neutral-700"} @xl:px-3 @xl:py-2 @max-xl:px-2.5 @max-xl:[&>span:not(.tab-icon):not(.diff-stats)]:hidden @max-xl:[&>.diff-stats]:inline @max-xl:[&>.diff-stats]:text-xs @max-xl:[&>.diff-stats]:ml-0.5 border-r border-gray-200 dark:border-neutral-600 last-of-type:border-r-0"
          title="Diff View - ${this.diffLinesAdded > 0 ||
          this.diffLinesRemoved > 0
            ? `+${this.diffLinesAdded} -${this.diffLinesRemoved}`
            : "No changes"}"
          @click=${() => this._handleViewModeClick("diff2")}
        >
          <span class="tab-icon text-base">±</span>
          <span class="diff-tex max-sm:hidden sm:max-xl:hidden">Diff</span>
          ${this.diffLinesAdded > 0 || this.diffLinesRemoved > 0
            ? html`<span
                class="diff-stats text-xs ml-1 opacity-80 ${this.activeMode ===
                "diff2"
                  ? "opacity-100"
                  : ""}"
                >+${this.diffLinesAdded} -${this.diffLinesRemoved}</span
              >`
            : ""}
        </button>

        <button
          id="showTerminalButton"
          class="px-3 py-2 bg-none border-0 border-b-2 cursor-pointer text-xs flex items-center gap-1.5 text-gray-600 dark:text-neutral-400 border-transparent transition-all whitespace-nowrap ${this
            .activeMode === "terminal"
            ? "border-b-blue-600 !dark:border-b-neutral-500 text-blue-600 font-medium bg-blue-50 dark:bg-neutral-700"
            : "hover:bg-gray-200 dark:hover:bg-neutral-700"} @xl:px-3 @xl:py-2 @max-xl:px-2.5 @max-xl:[&>span:not(.tab-icon):not(.diff-stats)]:hidden @max-xl:[&>.diff-stats]:inline @max-xl:[&>.diff-stats]:text-xs @max-xl:[&>.diff-stats]:ml-0.5 border-r border-gray-200 dark:border-neutral-600 last-of-type:border-r-0"
          title="Terminal View"
          @click=${() => this._handleViewModeClick("terminal")}
        >
          <span class="tab-icon text-base">💻</span>
          <span class="max-sm:hidden sm:max-xl:hidden">Terminal</span>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-view-mode-select": SketchViewModeSelect;
  }
}
