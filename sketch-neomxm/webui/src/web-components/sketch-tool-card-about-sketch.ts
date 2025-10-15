import { html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { customElement, property } from "lit/decorators.js";
import { ToolCall } from "../types";
import { marked } from "marked";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import "./sketch-tool-card-base";

// Safely renders markdown with fallback to plain text on failure
function renderMarkdown(markdownContent: string): string {
  try {
    return marked.parse(markdownContent, {
      gfm: true,
      breaks: true,
      async: false,
    }) as string;
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return markdownContent;
  }
}

@customElement("sketch-tool-card-about-sketch")
export class SketchToolCardAboutSketch extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  // Styles now handled by Tailwind classes in template

  render() {
    const resultText = this.toolCall?.result_message?.tool_result || "";

    const summaryContent = html`<span class="italic">
      <span class="mr-1.5">📚</span> About Sketch
    </span>`;
    const inputContent = html`<div>
      <span class="font-bold text-gray-800 dark:text-neutral-200"></span>
    </div>`;
    const resultContent = this.toolCall?.result_message?.tool_result
      ? html`<div
          class="bg-gray-50 dark:bg-neutral-700 rounded-md p-3 mt-2.5 max-h-[300px] overflow-y-auto border border-gray-200 dark:border-neutral-600 text-gray-900 dark:text-neutral-100"
        >
          ${unsafeHTML(renderMarkdown(resultText))}
        </div>`
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
    "sketch-tool-card-about-sketch": SketchToolCardAboutSketch;
  }
}
