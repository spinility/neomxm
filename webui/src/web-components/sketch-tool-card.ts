import { html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { customElement, property } from "lit/decorators.js";
import { ToolCall } from "../types";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import "./sketch-tool-card-base";

// Shared utility function for markdown rendering with DOMPurify sanitization
function renderMarkdown(markdownContent: string): string {
  try {
    // Parse markdown with default settings
    const htmlOutput = marked.parse(markdownContent, {
      gfm: true,
      breaks: true,
      async: false,
    }) as string;

    // Sanitize the output HTML with DOMPurify
    return DOMPurify.sanitize(htmlOutput, {
      // Allow common safe HTML elements
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "b",
        "i",
        "u",
        "s",
        "code",
        "pre",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "a",
      ],
      ALLOWED_ATTR: [
        "href",
        "title",
        "target",
        "rel", // For links
        "class", // For basic styling
      ],
      // Keep content formatting
      KEEP_CONTENT: true,
    });
  } catch (error) {
    console.error("Error rendering markdown:", error);
    // Fallback to sanitized plain text if markdown parsing fails
    return DOMPurify.sanitize(markdownContent);
  }
}

// Shared utility function for creating Tailwind pre elements
function createPreElement(content: string, additionalClasses: string = "") {
  return html`<pre
    class="bg-gray-200 dark:bg-neutral-700 text-black dark:text-neutral-100 p-2 rounded whitespace-pre-wrap break-words max-w-full w-full box-border overflow-wrap-break-word ${additionalClasses}"
  >
${content}</pre
  >`;
}

@customElement("sketch-tool-card-bash")
export class SketchToolCardBash extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  render() {
    const inputData = JSON.parse(this.toolCall?.input || "{}");
    const isBackground = inputData?.background === true;
    const isSlowOk = inputData?.slow_ok === true;
    const backgroundIcon = isBackground
      ? html`<span title="Running in background">🥷</span> `
      : "";
    const slowIcon = isSlowOk
      ? html`<span title="Extended timeouts">🐢</span> `
      : "";

    // Truncate the command if it's too long to display nicely
    const command = inputData?.command || "";
    const displayCommand =
      command.length > 80 ? command.substring(0, 80) + "..." : command;

    const summaryContent = html`<div
      class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
    >
      ${backgroundIcon}${slowIcon}${displayCommand}
    </div>`;

    const inputContent = html`<div
      class="flex w-full max-w-full flex-col overflow-wrap-break-word break-words"
    >
      <div class="w-full relative">
        <pre
          class="bg-gray-200 dark:bg-neutral-700 text-black dark:text-neutral-100 p-2 rounded whitespace-pre-wrap break-words max-w-full w-full box-border overflow-wrap-break-word w-full mb-0 rounded-t rounded-b-none box-border"
        >
${backgroundIcon}${slowIcon}${inputData?.command}</pre
        >
      </div>
    </div>`;

    const resultContent = this.toolCall?.result_message?.tool_result
      ? html`<div class="w-full relative">
          ${createPreElement(
            this.toolCall.result_message.tool_result,
            "mt-0 text-gray-600 rounded-t-none rounded-b w-full box-border max-h-[300px] overflow-y-auto",
          )}
        </div>`
      : "";

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .inputContent=${inputContent}
      .resultContent=${resultContent}
    ></sketch-tool-card-base>`;
  }
}

@customElement("sketch-tool-card-codereview")
export class SketchToolCardCodeReview extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  // Determine the status icon based on the content of the result message
  getStatusIcon(resultText: string): string {
    if (!resultText) return "";
    if (resultText === "OK") return "✔️";
    if (resultText.includes("# Errors")) return "⚠️";
    if (resultText.includes("# Info")) return "ℹ️";
    if (resultText.includes("uncommitted changes in repo")) return "🧹";
    if (resultText.includes("no new commits have been added")) return "🐣";
    if (resultText.includes("git repo is not clean")) return "🧼";
    return "❓";
  }

  render() {
    const resultText = this.toolCall?.result_message?.tool_result || "";
    const statusIcon = this.getStatusIcon(resultText);

    const summaryContent = html`<span>${statusIcon}</span>`;
    const resultContent = resultText ? createPreElement(resultText) : "";

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .resultContent=${resultContent}
    ></sketch-tool-card-base>`;
  }
}

@customElement("sketch-tool-card-done")
export class SketchToolCardDone extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  render() {
    const doneInput = JSON.parse(this.toolCall.input);

    const summaryContent = html`<span></span>`;

    const resultContent = html`<div>
      ${Object.keys(doneInput).map((key) => {
        const item = doneInput[key];
        let statusIcon = "〰️";
        if (item.status == "yes") {
          statusIcon = "✅";
        } else if (item.status == "not applicable") {
          statusIcon = "🤷";
        }
        return html`<div class="mb-1">
          <span>${statusIcon}</span> ${key}:${item.status}
        </div>`;
      })}
    </div>`;

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .resultContent=${resultContent}
    ></sketch-tool-card-base>`;
  }
}

@customElement("sketch-tool-card-patch")
export class SketchToolCardPatch extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  // Render a diff with syntax highlighting
  renderDiff(diff: string) {
    // Remove ---/+++ header lines and trim leading/trailing blank lines
    const lines = diff
      .split("\n")
      .filter((line) => !line.startsWith("---") && !line.startsWith("+++"))
      .join("\n")
      .trim()
      .split("\n");

    const coloredLines = lines.map((line) => {
      if (line.startsWith("+")) {
        // prettier-ignore
        return html`<div class="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20">${line}</div>`;
      } else if (line.startsWith("-")) {
        // prettier-ignore
        return html`<div class="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">${line}</div>`;
      } else if (line.startsWith("@@")) {
        // prettier-ignore
        return html`<div class="text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 font-semibold">${line}</div>`;
      } else {
        // prettier-ignore
        return html`<div class="text-gray-800 dark:text-neutral-200">${line}</div>`;
      }
    });

    // prettier-ignore
    return html`<pre class="bg-gray-100 dark:bg-neutral-800 text-xs p-2 rounded whitespace-pre-wrap break-words max-w-full w-full box-border overflow-x-auto font-mono text-gray-900 dark:text-neutral-100">${coloredLines}</pre>`;
  }

  render() {
    const patchInput = JSON.parse(this.toolCall?.input);

    const toolFailed = this.toolCall?.result_message?.tool_error;
    const summaryContent = html`<span
      class="text-gray-600 font-mono overflow-hidden text-ellipsis whitespace-nowrap rounded"
    >
      ${toolFailed
        ? `${patchInput?.path}: failed`
        : `${patchInput?.path}: ${patchInput.patches.length} edit${patchInput.patches.length > 1 ? "s" : ""}`}
    </span>`;

    const inputContent = html``;

    // Show diff if available, otherwise show the regular result
    let resultContent;
    if (
      this.toolCall?.result_message?.display &&
      typeof this.toolCall.result_message.display === "string"
    ) {
      // Render the diff with syntax highlighting
      resultContent = html`<div class="w-full relative">
        ${this.renderDiff(this.toolCall.result_message.display)}
      </div>`;
    } else if (this.toolCall?.result_message?.tool_result) {
      resultContent = createPreElement(
        this.toolCall.result_message.tool_result,
      );
    } else {
      resultContent = "";
    }

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .inputContent=${inputContent}
      .resultContent=${resultContent}
    ></sketch-tool-card-base>`;
  }
}

@customElement("sketch-tool-card-think")
export class SketchToolCardThink extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  render() {
    const thoughts = JSON.parse(this.toolCall?.input)?.thoughts || "";

    const summaryContent = html`<span
      class="overflow-hidden text-ellipsis font-mono"
    >
      ${thoughts.split("\n")[0]}
    </span>`;

    const inputContent = html`<div
      class="overflow-x-auto mb-1 font-mono px-2 py-1 bg-gray-200 dark:bg-neutral-700 rounded select-text cursor-text text-sm leading-relaxed text-gray-900 dark:text-neutral-100"
    >
      <div class="markdown-content">
        ${unsafeHTML(renderMarkdown(thoughts))}
      </div>
    </div>`;

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .inputContent=${inputContent}
    ></sketch-tool-card-base>`;
  }
}

@customElement("sketch-tool-card-todo-write")
export class SketchToolCardTodoWrite extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  render() {
    const inputData = JSON.parse(this.toolCall?.input || "{}");
    const tasks = inputData.tasks || [];

    // Generate circles based on task status
    const circles = tasks
      .map((task) => {
        switch (task.status) {
          case "completed":
            return "●"; // full circle
          case "in-progress":
            return "◐"; // half circle
          case "queued":
          default:
            return "○"; // empty circle
        }
      })
      .join(" ");

    const summaryContent = html`<span class="italic text-gray-600">
      ${circles}
    </span>`;
    const resultContent = this.toolCall?.result_message?.tool_result
      ? createPreElement(this.toolCall.result_message.tool_result)
      : "";

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .resultContent=${resultContent}
    ></sketch-tool-card-base>`;
  }
}

@customElement("sketch-tool-card-keyword-search")
export class SketchToolCardKeywordSearch extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  render() {
    const inputData = JSON.parse(this.toolCall?.input || "{}");
    const query = inputData.query || "";
    const searchTerms = inputData.search_terms || [];

    const summaryContent = html`<div
      class="flex flex-col gap-0.5 w-full max-w-full overflow-hidden"
    >
      <div
        class="text-gray-800 dark:text-gray-200 text-xs normal-case whitespace-normal break-words leading-tight"
      >
        🔍 ${query}
      </div>
      <div
        class="text-gray-600 dark:text-gray-400 text-xs normal-case whitespace-normal break-words leading-tight mt-px"
      >
        🗝️ ${searchTerms.join(", ")}
      </div>
    </div>`;

    const inputContent = html`<div>
      <div><strong>Query:</strong> ${query}</div>
      <div><strong>Search terms:</strong> ${searchTerms.join(", ")}</div>
    </div>`;

    const resultContent = this.toolCall?.result_message?.tool_result
      ? createPreElement(this.toolCall.result_message.tool_result)
      : "";

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .inputContent=${inputContent}
      .resultContent=${resultContent}
    ></sketch-tool-card-base>`;
  }
}

@customElement("sketch-tool-card-todo-read")
export class SketchToolCardTodoRead extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  render() {
    const summaryContent = html`<span class="italic text-gray-600">
      Read todo list
    </span>`;
    const resultContent = this.toolCall?.result_message?.tool_result
      ? createPreElement(this.toolCall.result_message.tool_result)
      : "";

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .resultContent=${resultContent}
    ></sketch-tool-card-base>`;
  }
}

@customElement("sketch-tool-card-generic")
export class SketchToolCardGeneric extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  render() {
    const summaryContent = html`<span
      class="block whitespace-normal break-words max-w-full w-full"
    >
      ${this.toolCall?.input}
    </span>`;

    const inputContent = html`<div class="max-w-full break-words">
      Input:
      ${createPreElement(
        this.toolCall?.input || "",
        "max-w-full whitespace-pre-wrap break-words",
      )}
    </div>`;

    const resultContent = this.toolCall?.result_message?.tool_result
      ? html`<div class="max-w-full break-words">
          Result: ${createPreElement(this.toolCall.result_message.tool_result)}
        </div>`
      : "";

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .inputContent=${inputContent}
      .resultContent=${resultContent}
    ></sketch-tool-card-base>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-tool-card-generic": SketchToolCardGeneric;
    "sketch-tool-card-bash": SketchToolCardBash;
    "sketch-tool-card-codereview": SketchToolCardCodeReview;
    "sketch-tool-card-done": SketchToolCardDone;
    "sketch-tool-card-patch": SketchToolCardPatch;
    "sketch-tool-card-think": SketchToolCardThink;
    "sketch-tool-card-todo-write": SketchToolCardTodoWrite;
    "sketch-tool-card-todo-read": SketchToolCardTodoRead;
    "sketch-tool-card-keyword-search": SketchToolCardKeywordSearch;
  }
}
