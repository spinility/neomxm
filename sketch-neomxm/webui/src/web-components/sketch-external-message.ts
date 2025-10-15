import { html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ExternalMessage } from "../types";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import type { WorkflowRunEvent } from "@octokit/webhooks-types";

@customElement("sketch-external-message")
export class SketchExternalMessage extends SketchTailwindElement {
  @property() message: ExternalMessage | null = null;
  @property() open: boolean;
  @property() summaryContent: TemplateResult | string = "";
  @property() detailsContent: TemplateResult | string = "";
  @state() detailsVisible: boolean = false;

  _toggleDetails(e: Event) {
    e.stopPropagation();
    this.detailsVisible = !this.detailsVisible;
  }

  constructor() {
    super();
  }

  render() {
    if (this.message?.message_type === "github_workflow_run") {
      const run = this.message.body as WorkflowRunEvent;
      this.summaryContent = html`<svg
          class="inline-block w-4 h-4"
          viewBox="0 0 16 16"
          width="16"
          height="16"
        >
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          ></path>
        </svg>
        <span
          class="inline-flex items-center px-1.5 py-1
        ${run.workflow_run.conclusion === "success"
            ? "bg-green-600/10 text-green-600"
            : run.workflow_run.conclusion === "failure"
              ? "bg-red-600/10 text-red-600"
              : "bg-gray-600/10 text-gray-600"}
          rounded-md text-xs flex-shrink-0 transition-colors"
          >${run.workflow.name} -
          ${run.workflow_run.conclusion || run.workflow_run.status}</span
        >
        on ${run.workflow_run.head_branch} at
        ${run.workflow_run.head_sha.substring(0, 8)}`;

      this.detailsContent = html`
        <div class="flex items-center gap-2">
          <span class="text-gray-700 dark:text-neutral-300">Workflow ID:</span>
          <span class="font-mono font-medium text-gray-800 dark:text-neutral-200">${run.workflow_run.id}</span>
        </div>
        <div class="flex items-center gap-2">
          bg-gray-600/10 text-gray-600
        {{end}}
          rounded-md text-xs flex-shrink-0 transition-colors'><a target="_blank"
            rel="noopener noreferrer"href="${run.workflow_run.html_url}">${run.workflow.name} - ${run.workflow_run.conclusion}</a>
            on ${run.workflow_run.head_branch} at ${run.workflow_run.head_commit}</span>
            </span>`;

      this.detailsContent = html`
        <div class="flex items-center gap-2">
          <span class="text-gray-700 dark:text-neutral-300"
            >Workflow Run ID:</span
          >
          <span
            class="font-mono font-medium text-gray-800 dark:text-neutral-200"
            >${run.workflow_run.id}</span
          >
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-700 dark:text-neutral-300">Status:</span>
          <span
            class="font-mono font-medium text-gray-800 dark:text-neutral-200"
            >${run.workflow_run.status}</span
          >
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-700 dark:text-neutral-300">Conclusion:</span>
          <span
            class="font-mono font-medium text-gray-800 dark:text-neutral-200"
            >${run.workflow_run.conclusion}</span
          >
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-700 dark:text-neutral-300">Run URL:</span>
          <a
            class="text-blue-600 dark:text-blue-400 hover:underline"
            href="${run.workflow_run.html_url}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${run.workflow_run.html_url}
          </a>
        </div>
      `;
    }

    return html`
      <div class="block max-w-full w-full box-border overflow-hidden">
        <div class="flex flex-col w-full">
          <div
            class="flex w-full box-border py-1.5 px-2 pl-3 items-center gap-2 cursor-pointer rounded relative overflow-hidden flex-wrap hover:bg-black/[0.02] dark:hover:bg-white/[0.05]"
            @click=${this._toggleDetails}
          >
            <span
              class="whitespace-nowrap flex-grow flex-shrink text-gray-700 dark:text-neutral-300 font-mono text-xs px-1 min-w-[50px] max-w-[calc(100%-150px)] inline-block"
              >${this.summaryContent}</span
            >
          </div>
          <div
            class="${this.detailsVisible
              ? "block"
              : "hidden"} p-2 bg-black/[0.02] dark:bg-white/[0.05] mt-px border-t border-black/[0.05] dark:border-white/[0.1] font-mono text-xs text-gray-800 dark:text-neutral-200 rounded-b max-w-full w-full box-border overflow-hidden"
          >
            ${this.detailsContent
              ? html`<div class="mb-2">${this.detailsContent}</div>`
              : ""}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-notification-message": SketchExternalMessage;
  }
}
