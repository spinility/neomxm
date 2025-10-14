import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { TodoList, TodoItem } from "../types.js";
import { SketchTailwindElement } from "./sketch-tailwind-element.js";

@customElement("sketch-todo-panel")
export class SketchTodoPanel extends SketchTailwindElement {
  @property()
  visible: boolean = false;

  @state()
  private todoList: TodoList | null = null;

  @state()
  private loading: boolean = false;

  @state()
  private error: string = "";

  @state()
  private showCommentBox: boolean = false;

  @state()
  private commentingItem: TodoItem | null = null;

  @state()
  private commentText: string = "";

  updateTodoContent(content: string) {
    try {
      if (!content.trim()) {
        this.todoList = null;
      } else {
        this.todoList = JSON.parse(content) as TodoList;
      }
      this.loading = false;
      this.error = "";
    } catch (error) {
      console.error("Failed to parse todo content:", error);
      this.error = "Failed to parse todo data";
      this.todoList = null;
      this.loading = false;
    }
  }

  private renderTodoItem(item: TodoItem) {
    const statusIcon =
      {
        queued: "⚪",
        "in-progress": "🦉",
        completed: "✅",
      }[item.status] || "?";

    // Only show comment button for non-completed items
    const showCommentButton = item.status !== "completed";

    return html`
      <div
        class="flex items-start p-2 mb-1.5 rounded bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 gap-2 min-h-6 border-l-[3px] border-l-gray-300 dark:border-l-neutral-600"
      >
        <div class="text-sm mt-0.5 flex-shrink-0">${statusIcon}</div>
        <div class="flex items-start justify-between w-full min-h-5">
          <div class="flex-1 min-w-0 pr-2">
            <div
              class="text-xs leading-snug text-gray-800 dark:text-neutral-200 break-words"
            >
              ${item.task}
            </div>
          </div>
          <div class="flex-shrink-0 flex items-start w-6 justify-center">
            ${showCommentButton
              ? html`
                  <button
                    class="bg-transparent border-none cursor-pointer text-sm p-0.5 text-gray-500 dark:text-neutral-400 opacity-70 transition-opacity duration-200 w-5 h-5 flex items-center justify-center hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 hover:bg-opacity-5 hover:rounded-sm"
                    @click="${() => this.openCommentBox(item)}"
                    title="Add comment about this TODO item"
                  >
                    💬
                  </button>
                `
              : ""}
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.visible) {
      return html``;
    }

    const todoIcon = html`
      <svg
        class="w-3.5 h-3.5 text-gray-500 dark:text-neutral-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
      </svg>
    `;

    let contentElement;
    if (this.loading) {
      contentElement = html`
        <div
          class="flex-1 overflow-y-auto p-2 pb-5 text-xs leading-relaxed min-h-0 flex items-center justify-center text-gray-500 dark:text-neutral-400"
        >
          <div
            class="w-5 h-5 border-2 border-gray-200 dark:border-neutral-600 border-t-blue-500 rounded-full animate-spin mr-2"
          ></div>
          Loading todos...
        </div>
      `;
    } else if (this.error) {
      contentElement = html`
        <div
          class="flex-1 overflow-y-auto p-2 pb-5 text-xs leading-relaxed min-h-0 text-red-600 dark:text-red-400 flex items-center justify-center"
        >
          Error: ${this.error}
        </div>
      `;
    } else if (
      !this.todoList ||
      !this.todoList.items ||
      this.todoList.items.length === 0
    ) {
      contentElement = html`
        <div
          class="flex-1 overflow-y-auto p-2 pb-5 text-xs leading-relaxed min-h-0 text-gray-400 dark:text-neutral-500 italic flex items-center justify-center"
        >
          No todos available
        </div>
      `;
    } else {
      const totalCount = this.todoList.items.length;
      const completedCount = this.todoList.items.filter(
        (item) => item.status === "completed",
      ).length;
      const _inProgressCount = this.todoList.items.filter(
        (item) => item.status === "in-progress",
      ).length;

      contentElement = html`
        <div
          class="py-2 px-3 border-b border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-700 font-semibold text-xs text-gray-800 dark:text-neutral-200 flex items-center gap-1.5"
        >
          <div class="flex items-center gap-1.5">
            ${todoIcon}
            <span>Sketching...</span>
            <span
              class="bg-gray-300 dark:bg-neutral-600 text-gray-500 dark:text-neutral-400 px-1.5 py-0.5 rounded-full text-xs font-normal"
              >${completedCount}/${totalCount}</span
            >
          </div>
        </div>
        <div
          class="flex-1 overflow-y-auto p-2 pb-5 text-xs leading-relaxed min-h-0"
        >
          ${this.todoList.items.map((item) => this.renderTodoItem(item))}
        </div>
      `;
    }

    return html`
      <div class="flex flex-col h-full bg-transparent overflow-hidden">
        ${contentElement}
      </div>
      ${this.showCommentBox ? this.renderCommentBox() : ""}
    `;
  }

  private renderCommentBox() {
    if (!this.commentingItem) return "";

    const statusText =
      {
        queued: "Queued",
        "in-progress": "In Progress",
        completed: "Completed",
      }[this.commentingItem.status] || this.commentingItem.status;

    return html`
      <style>
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-in-out;
        }
      </style>
      <div
        class="fixed inset-0 bg-black/30 dark:bg-black/50 z-[10000] flex items-center justify-center animate-fade-in"
        @click="${this.handleOverlayClick}"
      >
        <div
          class="bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-md shadow-lg p-4 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto"
          @click="${this.stopPropagation}"
        >
          <div class="flex justify-between items-center mb-3">
            <h3
              class="m-0 text-sm font-medium text-gray-900 dark:text-neutral-100"
            >
              Comment on TODO Item
            </h3>
            <button
              class="bg-transparent border-none cursor-pointer text-lg text-gray-500 dark:text-neutral-400 px-1.5 py-0.5 hover:text-gray-800 dark:hover:text-neutral-200"
              @click="${this.closeCommentBox}"
            >
              ×
            </button>
          </div>

          <div
            class="bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded p-2 mb-3 text-xs"
          >
            <div class="font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Status: ${statusText}
            </div>
            <div class="text-gray-800 dark:text-neutral-200">
              ${this.commentingItem.task}
            </div>
          </div>

          <textarea
            class="w-full min-h-20 p-2 border border-gray-300 dark:border-neutral-600 rounded resize-y text-xs mb-3 box-border bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
            placeholder="Type your comment about this TODO item..."
            .value="${this.commentText}"
            @input="${this.handleCommentInput}"
          ></textarea>

          <div class="flex justify-end gap-2">
            <button
              class="px-3 py-1.5 rounded cursor-pointer text-xs bg-transparent border border-gray-300 dark:border-neutral-600 text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-700"
              @click="${this.closeCommentBox}"
            >
              Cancel
            </button>
            <button
              class="px-3 py-1.5 rounded cursor-pointer text-xs bg-blue-500 text-white border-none hover:bg-blue-600"
              @click="${this.submitComment}"
            >
              Add Comment
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private openCommentBox(item: TodoItem) {
    this.commentingItem = item;
    this.commentText = "";
    this.showCommentBox = true;
  }

  private closeCommentBox() {
    this.showCommentBox = false;
    this.commentingItem = null;
    this.commentText = "";
  }

  private handleOverlayClick(_e: Event) {
    // Close when clicking outside the comment box
    this.closeCommentBox();
  }

  private stopPropagation(e: Event) {
    // Prevent clicks inside the comment box from closing it
    e.stopPropagation();
  }

  private handleCommentInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.commentText = target.value;
  }

  private submitComment() {
    if (!this.commentingItem || !this.commentText.trim()) {
      return;
    }

    // Format the comment similar to diff comments
    const statusText =
      {
        queued: "Queued",
        "in-progress": "In Progress",
        completed: "Completed",
      }[this.commentingItem.status] || this.commentingItem.status;

    const formattedComment = `\`\`\`
TODO Item (${statusText}): ${this.commentingItem.task}
\`\`\`

${this.commentText}`;

    // Dispatch a custom event similar to diff comments
    const event = new CustomEvent("todo-comment", {
      detail: { comment: formattedComment },
      bubbles: true,
      composed: true,
    });

    this.dispatchEvent(event);

    // Close the comment box
    this.closeCommentBox();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-todo-panel": SketchTodoPanel;
  }
}
