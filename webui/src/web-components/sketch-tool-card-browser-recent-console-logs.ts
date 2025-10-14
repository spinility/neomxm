import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ToolCall } from "../types";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import "./sketch-tool-card-base";

@customElement("sketch-tool-card-browser-recent-console-logs")
export class SketchToolCardBrowserRecentConsoleLogs extends SketchTailwindElement {
  @property()
  toolCall: ToolCall;

  @property()
  open: boolean;

  render() {
    // Parse the input to get limit
    let limit = "";
    try {
      if (this.toolCall?.input) {
        const input = JSON.parse(this.toolCall.input);
        limit = input.limit ? input.limit.toString() : "100";
      }
    } catch (e) {
      console.error("Error parsing recent console logs input:", e);
    }

    const summaryContent = html`<span
      class="font-mono text-gray-700 dark:text-neutral-300 break-all"
    >
      📜 Console logs (${limit})
    </span>`;
    const inputContent = html`<div>
      Get recent console logs:
      <span
        class="font-mono bg-black/[0.05] dark:bg-white/[0.1] px-2 py-1 rounded inline-block break-all"
        >limit ${limit}</span
      >
    </div>`;
    const resultContent = this.toolCall?.result_message?.tool_result
      ? html`<pre
          class="bg-gray-200 dark:bg-neutral-700 text-black dark:text-neutral-100 p-2 rounded whitespace-pre-wrap break-words max-w-full w-full box-border"
        >
${this.toolCall.result_message.tool_result}</pre
        >`
      : "";

    return html`
      <sketch-tool-card-base
        .open=${this.open}
        .toolCall=${this.toolCall}
        .summaryContent=${summaryContent}
        .inputContent=${inputContent}
        .resultContent=${resultContent}
      >
      </sketch-tool-card-base>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-tool-card-browser-recent-console-logs": SketchToolCardBrowserRecentConsoleLogs;
  }
}
