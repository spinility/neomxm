import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { State, ToolCall } from "../types";
import { SketchTailwindElement } from "./sketch-tailwind-element.js";
import "./sketch-tool-card";
import "./sketch-tool-card-take-screenshot";
import "./sketch-tool-card-about-sketch";
import "./sketch-tool-card-browser-navigate";
import "./sketch-tool-card-browser-eval";
import "./sketch-tool-card-browser-resize";
import "./sketch-tool-card-read-image";
import "./sketch-tool-card-browser-recent-console-logs";
import "./sketch-tool-card-browser-clear-console-logs";

@customElement("sketch-tool-calls")
export class SketchToolCalls extends SketchTailwindElement {
  @property()
  toolCalls: ToolCall[] = [];

  @property()
  open: boolean = false;

  @property()
  state: State;

  @state()
  expanded: boolean = false;

  constructor() {
    super();
  }

  cardForToolCall(toolCall: ToolCall, open: boolean) {
    switch (toolCall.name) {
      case "bash":
        return html`<sketch-tool-card-bash
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-bash>`;
      case "codereview":
        return html`<sketch-tool-card-codereview
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-codereview>`;
      case "done":
        return html`<sketch-tool-card-done
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-done>`;
      case "patch":
        return html`<sketch-tool-card-patch
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-patch>`;
      case "think":
        return html`<sketch-tool-card-think
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-think>`;
      case "browser_take_screenshot":
        return html`<sketch-tool-card-take-screenshot
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-take-screenshot>`;
      case "about_sketch":
        return html`<sketch-tool-card-about-sketch
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-about-sketch>`;
      case "todo_write":
        return html`<sketch-tool-card-todo-write
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-todo-write>`;
      case "todo_read":
        return html`<sketch-tool-card-todo-read
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-todo-read>`;
      case "browser_navigate":
        return html`<sketch-tool-card-browser-navigate
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-browser-navigate>`;
      case "keyword_search":
        return html`<sketch-tool-card-keyword-search
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-keyword-search>`;
      case "browser_eval":
        return html`<sketch-tool-card-browser-eval
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-browser-eval>`;
      case "browser_resize":
        return html`<sketch-tool-card-browser-resize
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-browser-resize>`;
      case "read_image":
        return html`<sketch-tool-card-read-image
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-read-image>`;
      case "browser_recent_console_logs":
        return html`<sketch-tool-card-browser-recent-console-logs
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-browser-recent-console-logs>`;
      case "browser_clear_console_logs":
        return html`<sketch-tool-card-browser-clear-console-logs
          .open=${open}
          .toolCall=${toolCall}
        ></sketch-tool-card-browser-clear-console-logs>`;
    }
    return html`<sketch-tool-card-generic
      .open=${open}
      .toolCall=${toolCall}
    ></sketch-tool-card-generic>`;
  }

  // toolUseKey return value should change, if the toolCall gets a response.
  toolUseKey(toolCall: ToolCall): string {
    if (!toolCall.result_message) {
      return toolCall.tool_call_id;
    }
    return `${toolCall.tool_call_id}-${toolCall.result_message.idx}`;
  }

  render() {
    if (!this.toolCalls || this.toolCalls.length === 0) {
      return html``;
    }

    return html`<div class="mt-2 pt-1 max-w-full w-full box-border">
      <div class="block">
        ${repeat(this.toolCalls, this.toolUseKey, (toolCall, idx) => {
          let shouldOpen = false;
          // Always expand screenshot and patch tool calls, expand last tool call if this.open is true
          if (
            toolCall.name === "browser_take_screenshot" ||
            toolCall.name === "patch" ||
            (idx == this.toolCalls?.length - 1 && this.open)
          ) {
            shouldOpen = true;
          }
          return html`<div
            id="${toolCall.tool_call_id}"
            class="flex flex-col bg-white/60 dark:bg-neutral-700/60 rounded-md mb-1.5 overflow-hidden cursor-pointer border-l-2 border-black/10 dark:border-white/10 shadow-sm max-w-full break-words ${toolCall.name}"
          >
            ${this.cardForToolCall(toolCall, shouldOpen)}
          </div>`;
        })}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-tool-calls": SketchToolCalls;
  }
}
