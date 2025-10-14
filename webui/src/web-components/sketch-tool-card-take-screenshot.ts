import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ToolCall } from "../types";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import "./sketch-tool-card-base";

@customElement("sketch-tool-card-take-screenshot")
export class SketchToolCardTakeScreenshot extends SketchTailwindElement {
  @property()
  toolCall: ToolCall;

  @property()
  open: boolean;

  @state()
  imageLoaded: boolean = false;

  @state()
  loadError: boolean = false;

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  render() {
    // Parse the input to get selector
    let selector = "";
    try {
      if (this.toolCall?.input) {
        const input = JSON.parse(this.toolCall.input);
        selector = input.selector || "(full page)";
      }
    } catch (e) {
      console.error("Error parsing screenshot input:", e);
    }

    // Extract the screenshot ID from the result text
    let screenshotId = "";
    let hasResult = false;
    if (this.toolCall?.result_message?.tool_result) {
      // The tool result is now a text like "Screenshot taken (saved as /tmp/sketch-screenshots/{id}.png)"
      // Extract the ID from this text
      const resultText = this.toolCall.result_message.tool_result;
      const pathMatch = resultText.match(
        /\/tmp\/sketch-screenshots\/(.*?)\.png/,
      );
      if (pathMatch) {
        screenshotId = pathMatch[1];
        hasResult = true;
      }
    }

    // Construct the URL for the screenshot (using relative URL without leading slash)
    const screenshotUrl = screenshotId ? `screenshot/${screenshotId}` : "";

    const summaryContent = html`<span class="italic p-2">
      Screenshot of ${selector}
    </span>`;
    const inputContent = html`<div
      class="px-2 py-1 bg-gray-100 dark:bg-neutral-700 rounded font-mono my-1.5 inline-block"
    >
      ${selector !== "(full page)"
        ? `Taking screenshot of element: ${selector}`
        : `Taking full page screenshot`}
    </div>`;
    const resultContent = hasResult
      ? html`
          <div class="my-2.5 flex flex-col items-center">
            ${!this.imageLoaded && !this.loadError
              ? html`<div
                  class="m-5 text-gray-600 dark:text-neutral-400 italic"
                >
                  Loading screenshot...
                </div>`
              : ""}
            ${this.loadError
              ? html`<div class="text-red-700 dark:text-red-400 italic my-2.5">
                  Failed to load screenshot
                </div>`
              : html`
                  <img
                    class="max-w-full max-h-[500px] rounded shadow-md border border-gray-300 dark:border-neutral-600"
                    src="${screenshotUrl}"
                    @load=${() => (this.imageLoaded = true)}
                    @error=${() => (this.loadError = true)}
                    ?hidden=${!this.imageLoaded}
                  />
                  ${this.imageLoaded
                    ? html`<div
                        class="mt-2 text-xs text-gray-600 dark:text-neutral-400"
                      >
                        Screenshot saved and displayed
                      </div>`
                    : ""}
                `}
          </div>
        `
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
    "sketch-tool-card-take-screenshot": SketchToolCardTakeScreenshot;
  }
}
