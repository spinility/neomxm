import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { ref } from "lit/directives/ref.js";
import { SketchAppShellBase } from "./sketch-app-shell-base";

@customElement("sketch-app-shell")
export class SketchAppShell extends SketchAppShellBase {
  connectedCallback(): void {
    super.connectedCallback();

    this.dataManager.addEventListener("sessionEnded", () => {
      this.handleSessionEnded();
    });
  }

  async handleSessionEnded() {
    await this.navigateToMessagesArchiveView();
  }

  render() {
    return html`
      <!-- Main container: flex column, full height, system font, hidden overflow-x -->
      <div
        class="block font-sans text-gray-800 dark:text-neutral-200 leading-relaxed h-screen w-full relative overflow-x-hidden flex flex-col bg-white dark:bg-neutral-900"
      >
        ${this.renderTopBanner()}

        <!-- Main content area: scrollable, flex-1 -->
        <div
          id="view-container"
          ${ref(this.scrollContainerRef)}
          class="self-stretch overflow-y-auto flex-1 flex flex-col min-h-0"
        >
          <div
            id="view-container-inner"
            class="${this.viewMode === "diff2"
              ? "max-w-full w-full h-full p-0 flex flex-col flex-1 min-h-0"
              : this._todoPanelVisible && this.viewMode === "chat"
                ? "max-w-none w-full m-0 px-5"
                : "max-w-6xl w-[calc(100%-40px)] mx-auto"} relative pb-2.5 pt-2.5 flex flex-col h-full"
          >
            ${this.renderMainViews()}
          </div>
        </div>

        ${this.renderChatInput()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-app-shell": SketchAppShell;
  }
}
