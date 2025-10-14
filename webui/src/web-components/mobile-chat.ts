import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { repeat } from "lit/directives/repeat.js";
import { AgentMessage } from "../types";
import { createRef, ref } from "lit/directives/ref.js";
import { marked, MarkedOptions, Renderer } from "marked";
import DOMPurify from "dompurify";
import { SketchTailwindElement } from "./sketch-tailwind-element";

@customElement("mobile-chat")
export class MobileChat extends SketchTailwindElement {
  @property({ type: Array })
  messages: AgentMessage[] = [];

  @property({ type: Boolean })
  isThinking = false;

  private scrollContainer = createRef<HTMLDivElement>();

  @state()
  private showJumpToBottom = false;

  connectedCallback() {
    super.connectedCallback();
    // Add animation styles to document head if not already present
    if (!document.getElementById("mobile-chat-animations")) {
      const style = document.createElement("style");
      style.id = "mobile-chat-animations";
      style.textContent = `
        @keyframes thinking {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .thinking-dot {
          animation: thinking 1.4s ease-in-out infinite both;
        }
        .thinking-dot:nth-child(1) { animation-delay: -0.32s; }
        .thinking-dot:nth-child(2) { animation-delay: -0.16s; }
        .thinking-dot:nth-child(3) { animation-delay: 0; }
      `;
      document.head.appendChild(style);
    }
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (
      changedProperties.has("messages") ||
      changedProperties.has("isThinking")
    ) {
      this.scrollToBottom();
    }

    // Set up scroll listener if not already done
    if (this.scrollContainer.value && !this.scrollContainer.value.onscroll) {
      this.scrollContainer.value.addEventListener(
        "scroll",
        this.handleScroll.bind(this),
      );
    }
  }

  private scrollToBottom() {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (this.scrollContainer.value) {
        this.scrollContainer.value.scrollTop =
          this.scrollContainer.value.scrollHeight;
      }
    });
  }

  private handleScroll() {
    if (!this.scrollContainer.value) return;

    const container = this.scrollContainer.value;
    const isAtBottom =
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 50; // 50px tolerance

    this.showJumpToBottom = !isAtBottom;
  }

  private jumpToBottom() {
    this.scrollToBottom();
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  private getMessageRole(message: AgentMessage): string {
    if (message.type === "user") {
      return "user";
    }
    if (message.type === "error") {
      return "error";
    }
    return "assistant";
  }

  private getMessageText(message: AgentMessage): string {
    return message.content || "";
  }

  private shouldShowMessage(message: AgentMessage): boolean {
    // Filter out hidden messages (subconversations) like the regular UI does
    if (message.hide_output) {
      return false;
    }

    // Show user, agent, and error messages with content
    return (
      (message.type === "user" ||
        message.type === "agent" ||
        message.type === "error") &&
      message.content &&
      message.content.trim().length > 0
    );
  }

  private getMessageKey(message: AgentMessage, index: number): string {
    // Create a stable, unique key for each message
    // Use timestamp if available, otherwise fall back to index + content hash
    if (message.timestamp) {
      return `${message.timestamp}-${message.type}`;
    }
    // Fallback for messages without timestamps
    return `${index}-${message.type}-${message.content?.length || 0}`;
  }

  private renderMarkdown(markdownContent: string): string {
    try {
      // Create a custom renderer for mobile-optimized rendering
      const renderer = new Renderer();

      // Override code renderer to simplify for mobile
      renderer.code = function ({
        text,
        lang,
      }: {
        text: string;
        lang?: string;
      }): string {
        const langClass = lang ? ` class="language-${lang}"` : "";
        return `<pre><code${langClass}>${text}</code></pre>`;
      };

      // Set markdown options for mobile
      const markedOptions: MarkedOptions = {
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Convert newlines to <br>
        async: false,
        renderer: renderer,
      };

      // Parse markdown and sanitize the output HTML
      const htmlOutput = marked.parse(markdownContent, markedOptions) as string;
      return DOMPurify.sanitize(htmlOutput, {
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
        ALLOWED_ATTR: ["href", "title", "target", "rel", "class"],
        KEEP_CONTENT: true,
      });
    } catch (error) {
      console.error("Error rendering markdown:", error);
      // Fallback to sanitized plain text if markdown parsing fails
      return DOMPurify.sanitize(markdownContent);
    }
  }

  private renderToolCalls(message: AgentMessage) {
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return "";
    }

    return html`
      <div class="mt-3 flex flex-col gap-1.5">
        ${message.tool_calls.map((toolCall) => {
          const summary = this.getToolSummary(toolCall);

          return html`
            <div
              class="bg-black/[0.04] rounded-lg px-2 py-1.5 text-xs font-mono leading-snug flex items-center gap-1.5 ${toolCall.name}"
            >
              <span
                class="font-bold text-gray-800 dark:text-gray-100 flex-shrink-0 mr-0.5"
                >${toolCall.name}</span
              >
              <span
                class="text-gray-600 dark:text-gray-300 flex-grow overflow-hidden text-ellipsis whitespace-nowrap"
                >${summary}</span
              >
            </div>
          `;
        })}
      </div>
    `;
  }

  private getToolStatusIcon(_toolCall: any): string {
    // Don't show status icons for mobile
    return "";
  }

  private getToolSummary(toolCall: any): string {
    try {
      const input = JSON.parse(toolCall.input || "{}");

      /* eslint-disable no-case-declarations */
      switch (toolCall.name) {
        case "bash":
          const command = input.command || "";
          const isBackground = input.background === true;
          const bgPrefix = isBackground ? "[bg] " : "";
          return (
            bgPrefix +
            (command.length > 40 ? command.substring(0, 40) + "..." : command)
          );

        case "patch":
          const path = input.path || "unknown";
          const patchCount = (input.patches || []).length;
          return `${path}: ${patchCount} edit${patchCount > 1 ? "s" : ""}`;

        case "think":
          const thoughts = input.thoughts || "";
          const firstLine = thoughts.split("\n")[0] || "";
          return firstLine.length > 50
            ? firstLine.substring(0, 50) + "..."
            : firstLine;

        case "keyword_search":
          const query = input.query || "";
          return query.length > 50 ? query.substring(0, 50) + "..." : query;

        case "browser_navigate":
          return input.url || "";

        case "browser_take_screenshot":
          return "Taking screenshot";

        case "browser_resize":
          return `Resize: ${input.width || ""}x${input.height || ""}`;

        case "todo_write":
          const tasks = input.tasks || [];
          return `${tasks.length} task${tasks.length > 1 ? "s" : ""}`;

        case "todo_read":
          return "Read todo list";

        case "done":
          return "Task completion checklist";

        default:
          // For unknown tools, show first part of input
          const inputStr = JSON.stringify(input);
          return inputStr.length > 50
            ? inputStr.substring(0, 50) + "..."
            : inputStr;
      }
      /* eslint-enable no-case-declarations */
    } catch {
      return "Tool call";
    }
  }

  private getToolDuration(_toolCall: any): string {
    // Don't show duration for mobile
    return "";
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.scrollContainer.value) {
      this.scrollContainer.value.removeEventListener(
        "scroll",
        this.handleScroll.bind(this),
      );
    }
  }

  render() {
    const displayMessages = this.messages.filter((msg) =>
      this.shouldShowMessage(msg),
    );

    return html`
      <div class="block h-full overflow-hidden">
        <div
          class="h-full overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth"
          style="-webkit-overflow-scrolling: touch;"
          ${ref(this.scrollContainer)}
        >
          ${displayMessages.length === 0
            ? html`
                <div
                  class="empty-state flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 italic text-center p-8"
                >
                  Start a conversation with Sketch...
                </div>
              `
            : repeat(
                displayMessages,
                (message, index) => this.getMessageKey(message, index),
                (message) => {
                  const role = this.getMessageRole(message);
                  const text = this.getMessageText(message);
                  // const timestamp = message.timestamp; // Unused for mobile layout

                  return html`
                    <div
                      class="message ${role} flex flex-col max-w-[85%] break-words ${role ===
                      "user"
                        ? "self-end items-end"
                        : "self-start items-start"}"
                    >
                      <div
                        class="message-bubble px-3 py-2 rounded-[18px] text-base leading-relaxed ${role ===
                        "user"
                          ? "bg-blue-500 text-white rounded-br-[6px]"
                          : role === "error"
                            ? "bg-red-50 text-red-700"
                            : "bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-100 rounded-bl-[6px]"}"
                      >
                        ${role === "assistant"
                          ? html`<div class="leading-6 break-words">
                              <style>
                                .markdown-content p {
                                  margin: 0.3em 0;
                                }
                                .markdown-content p:first-child {
                                  margin-top: 0;
                                }
                                .markdown-content p:last-child {
                                  margin-bottom: 0;
                                }
                                .markdown-content h1,
                                .markdown-content h2,
                                .markdown-content h3,
                                .markdown-content h4,
                                .markdown-content h5,
                                .markdown-content h6 {
                                  margin: 0.5em 0 0.3em 0;
                                  font-weight: bold;
                                }
                                .markdown-content h1 {
                                  font-size: 1.2em;
                                }
                                .markdown-content h2 {
                                  font-size: 1.15em;
                                }
                                .markdown-content h3 {
                                  font-size: 1.1em;
                                }
                                .markdown-content h4,
                                .markdown-content h5,
                                .markdown-content h6 {
                                  font-size: 1.05em;
                                }
                                .markdown-content code {
                                  background-color: rgba(0, 0, 0, 0.08);
                                  padding: 2px 4px;
                                  border-radius: 3px;
                                  font-family:
                                    Monaco, Menlo, "Ubuntu Mono", monospace;
                                  font-size: 0.9em;
                                }
                                .markdown-content pre {
                                  background-color: rgba(0, 0, 0, 0.08);
                                  padding: 8px;
                                  border-radius: 6px;
                                  margin: 0.5em 0;
                                  overflow-x: auto;
                                  font-size: 0.9em;
                                }
                                .markdown-content pre code {
                                  background: none;
                                  padding: 0;
                                }
                                .markdown-content ul,
                                .markdown-content ol {
                                  margin: 0.5em 0;
                                  padding-left: 1.2em;
                                }
                                .markdown-content li {
                                  margin: 0.2em 0;
                                }
                                .markdown-content blockquote {
                                  border-left: 3px solid rgba(0, 0, 0, 0.2);
                                  margin: 0.5em 0;
                                  padding-left: 0.8em;
                                  font-style: italic;
                                }
                                .markdown-content a {
                                  color: inherit;
                                  text-decoration: underline;
                                }
                                .markdown-content strong,
                                .markdown-content b {
                                  font-weight: bold;
                                }
                                .markdown-content em,
                                .markdown-content i {
                                  font-style: italic;
                                }
                              </style>
                              <div class="markdown-content">
                                ${unsafeHTML(this.renderMarkdown(text))}
                              </div>
                            </div>`
                          : text}
                        ${this.renderToolCalls(message)}
                      </div>
                    </div>
                  `;
                },
              )}
          ${this.isThinking
            ? html`
                <div
                  class="thinking-message flex flex-col max-w-[85%] break-words self-start items-start"
                >
                  <div
                    class="bg-gray-100 p-4 rounded-[18px] rounded-bl-[6px] flex items-center gap-2"
                  >
                    <span class="thinking-text text-gray-500 italic"
                      >Sketch is thinking</span
                    >
                    <div class="thinking-dots flex gap-1">
                      <div
                        class="w-1.5 h-1.5 rounded-full bg-gray-500 thinking-dot"
                      ></div>
                      <div
                        class="w-1.5 h-1.5 rounded-full bg-gray-500 thinking-dot"
                      ></div>
                      <div
                        class="w-1.5 h-1.5 rounded-full bg-gray-500 thinking-dot"
                      ></div>
                    </div>
                  </div>
                </div>
              `
            : ""}
        </div>
      </div>

      ${this.showJumpToBottom
        ? html`
            <button
              class="fixed bottom-[70px] left-1/2 transform -translate-x-1/2 bg-black/60 text-white border-none rounded-xl px-2 py-1 text-xs font-normal cursor-pointer shadow-sm z-[1100] transition-all duration-150 flex items-center gap-1 opacity-80 hover:bg-black/80 hover:-translate-y-px hover:opacity-100 hover:shadow-md active:translate-y-0"
              @click=${this.jumpToBottom}
              aria-label="Jump to bottom"
            >
              ↓ Jump to bottom
            </button>
          `
        : ""}
    `;
  }
}
