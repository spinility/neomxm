import { html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ToolCall } from "../types";
import { SketchTailwindElement } from "./sketch-tailwind-element";

@customElement("sketch-tool-card-base")
export class SketchToolCardBase extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;
  @property() summaryContent: TemplateResult | string = "";
  @property() inputContent: TemplateResult | string = "";
  @property() resultContent: TemplateResult | string = "";
  @state() detailsVisible: boolean = false;

  _cancelToolCall = async (tool_call_id: string, button: HTMLButtonElement) => {
    button.innerText = "Cancelling";
    button.disabled = true;
    try {
      const response = await fetch("cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_call_id: tool_call_id,
          reason: "user requested cancellation",
        }),
      });
      if (response.ok) {
        button.parentElement.removeChild(button);
      } else {
        button.innerText = "Cancel";
      }
    } catch (e) {
      console.error("cancel", tool_call_id, e);
    }
  };

  _toggleDetails(e: Event) {
    e.stopPropagation();
    this.detailsVisible = !this.detailsVisible;
  }

  render() {
    // Status indicator based on result
    let statusIcon = html`<span
      class="flex items-center justify-center text-sm text-yellow-500 animate-spin"
      >⏳</span
    >`;
    if (this.toolCall?.result_message) {
      statusIcon = this.toolCall?.result_message.tool_error
        ? html`<span
            class="flex items-center justify-center text-sm text-gray-500 dark:text-neutral-400"
            >〰️</span
          >`
        : html`<span
            class="flex items-center justify-center text-sm text-green-600 dark:text-green-400"
            >✓</span
          >`;
    }

    // Cancel button for pending operations
    const cancelButton = this.toolCall?.result_message
      ? ""
      : html`<button
          class="cursor-pointer text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed border-none rounded text-xs px-1.5 py-0.5 whitespace-nowrap min-w-[50px]"
          title="Cancel this operation"
          @click=${(e: Event) => {
            e.stopPropagation();
            this._cancelToolCall(
              this.toolCall?.tool_call_id,
              e.target as HTMLButtonElement,
            );
          }}
        >
          Cancel
        </button>`;

    // Elapsed time display
    const elapsed = this.toolCall?.result_message?.elapsed
      ? html`<span
          class="text-xs text-gray-600 dark:text-neutral-400 whitespace-nowrap min-w-[40px] text-right"
          >${(this.toolCall?.result_message?.elapsed / 1e9).toFixed(1)}s</span
        >`
      : html`<span
          class="text-xs text-gray-600 dark:text-neutral-400 whitespace-nowrap min-w-[40px] text-right"
        ></span>`;

    // Initialize details visibility based on open property
    if (this.open && !this.detailsVisible) {
      this.detailsVisible = true;
    }

    return html`<div class="block max-w-full w-full box-border overflow-hidden">
      <div class="flex flex-col w-full">
        <div
          class="flex w-full box-border py-1.5 px-2 pl-3 items-center gap-2 cursor-pointer rounded relative overflow-hidden flex-wrap hover:bg-black/[0.02] dark:hover:bg-white/[0.05]"
          @click=${this._toggleDetails}
        >
          <span
            class="font-mono font-medium text-gray-700 dark:text-neutral-300 bg-black/[0.05] dark:bg-white/[0.1] rounded px-1.5 py-0.5 flex-shrink-0 min-w-[45px] text-xs text-center whitespace-nowrap"
            >${this.toolCall?.name}</span
          >
          <span
            class="whitespace-normal break-words flex-grow flex-shrink text-gray-700 dark:text-neutral-300 font-mono text-xs px-1 min-w-[50px] max-w-[calc(100%-150px)] inline-block"
            >${this.summaryContent}</span
          >
          <div
            class="flex items-center gap-3 ml-auto flex-shrink-0 min-w-[120px] justify-end pr-2"
          >
            ${statusIcon} ${elapsed} ${cancelButton}
          </div>
        </div>
        <div
          class="${this.detailsVisible
            ? "block"
            : "hidden"} p-2 bg-black/[0.02] dark:bg-white/[0.05] mt-px border-t border-black/[0.05] dark:border-white/[0.1] font-mono text-xs text-gray-800 dark:text-neutral-200 rounded-b max-w-full w-full box-border overflow-hidden"
        >
          ${this.inputContent
            ? html`<div class="mb-2">${this.inputContent}</div>`
            : ""}
          ${this.resultContent
            ? html`<div class="${this.inputContent ? "mt-2" : ""}">
                ${this.resultContent}
              </div>`
            : ""}
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-tool-card-base": SketchToolCardBase;
  }
}
