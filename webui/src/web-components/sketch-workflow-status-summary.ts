import { html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AgentMessage } from "../types";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import type { WorkflowRunEvent } from "@octokit/webhooks-types";

// Types for our aggregated workflow data
interface WorkflowStatus {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  run_id: number;
  last_updated: string;
  // Additional fields for individual events
  timestamp?: string;
  workflow_name?: string;
  branch?: string;
  commit_sha?: string;
}

interface BranchCommitSummary {
  branch: string;
  commit_sha: string;
  commit_short: string;
  workflows: WorkflowStatus[];
  events?: WorkflowStatus[]; // individual events for details
}

@customElement("sketch-workflow-status-summary")
export class SketchWorkflowStatusSummary extends SketchTailwindElement {
  @property({ type: Array }) messages: AgentMessage[] = [];
  @property({ type: String }) branch?: string;
  @property({ type: String }) commit?: string;

  @state() private summaries: BranchCommitSummary[] = [];

  constructor() {
    super();
  }

  // Aggregate workflow run events from timeline messages with individual events
  private aggregateWorkflowDataWithEvents(): BranchCommitSummary[] {
    const eventsByBranchCommit = new Map<string, WorkflowStatus[]>();
    const workflowsByBranchCommit = new Map<
      string,
      Map<string, WorkflowStatus>
    >();

    // Process all external messages looking for github_workflow_run events
    this.messages.forEach((message) => {
      if (
        message.type === "external" &&
        message.external_message?.message_type === "github_workflow_run"
      ) {
        const run = message.external_message.body as WorkflowRunEvent;
        const key = `${run.workflow_run.head_branch}:${run.workflow_run.head_sha}`;
        const workflowName = run.workflow.name;

        // Store individual event
        if (!eventsByBranchCommit.has(key)) {
          eventsByBranchCommit.set(key, []);
        }
        eventsByBranchCommit.get(key)!.push({
          name: workflowName,
          status: run.workflow_run.status,
          conclusion: run.workflow_run.conclusion,
          html_url: run.workflow_run.html_url,
          run_id: run.workflow_run.id,
          last_updated: message.timestamp,
          // Additional fields for individual events
          timestamp: message.timestamp,
          workflow_name: workflowName,
          branch: run.workflow_run.head_branch,
          commit_sha: run.workflow_run.head_sha,
        });

        // Also maintain aggregated workflows for summary
        if (!workflowsByBranchCommit.has(key)) {
          workflowsByBranchCommit.set(key, new Map());
        }

        const branchWorkflows = workflowsByBranchCommit.get(key)!;
        const existing = branchWorkflows.get(workflowName);

        // Keep the most recent event for each workflow
        const eventTime = new Date(message.timestamp).getTime();
        const existingTime = existing
          ? new Date(existing.last_updated).getTime()
          : 0;

        if (!existing || eventTime > existingTime) {
          branchWorkflows.set(workflowName, {
            name: workflowName,
            status: run.workflow_run.status,
            conclusion: run.workflow_run.conclusion,
            html_url: run.workflow_run.html_url,
            run_id: run.workflow_run.id,
            last_updated: message.timestamp,
          });
        }
      }
    });

    // Convert to array format
    const summaries: BranchCommitSummary[] = [];
    eventsByBranchCommit.forEach((events, key) => {
      const [branch, commit_sha] = key.split(":");
      const workflows = workflowsByBranchCommit.get(key);
      summaries.push({
        branch,
        commit_sha,
        commit_short: commit_sha.substring(0, 7),
        workflows: workflows
          ? Array.from(workflows.values()).sort((a, b) =>
              a.name.localeCompare(b.name),
            )
          : [],
        events: events.sort(
          (a, b) =>
            new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime(),
        ),
      });
    });

    return summaries.sort((a, b) => {
      // Sort by most recent activity
      const aLatest = Math.max(
        ...a.workflows.map((w) => new Date(w.last_updated).getTime()),
      );
      const bLatest = Math.max(
        ...b.workflows.map((w) => new Date(w.last_updated).getTime()),
      );
      return bLatest - aLatest;
    });
  }

  // Aggregate workflow run events from timeline messages (legacy method)
  private aggregateWorkflowData(): BranchCommitSummary[] {
    const workflowsByBranchCommit = new Map<
      string,
      Map<string, WorkflowStatus>
    >();

    // Process all external messages looking for github_workflow_run events
    this.messages.forEach((message) => {
      if (
        message.type === "external" &&
        message.external_message?.message_type === "github_workflow_run"
      ) {
        const run = message.external_message.body as WorkflowRunEvent;
        const key = `${run.workflow_run.head_branch}:${run.workflow_run.head_sha}`;
        const workflowName = run.workflow.name;

        if (!workflowsByBranchCommit.has(key)) {
          workflowsByBranchCommit.set(key, new Map());
        }

        const branchWorkflows = workflowsByBranchCommit.get(key)!;
        const existing = branchWorkflows.get(workflowName);

        // Keep the most recent event for each workflow
        const eventTime = new Date(message.timestamp).getTime();
        const existingTime = existing
          ? new Date(existing.last_updated).getTime()
          : 0;

        if (!existing || eventTime > existingTime) {
          branchWorkflows.set(workflowName, {
            name: workflowName,
            status: run.workflow_run.status,
            conclusion: run.workflow_run.conclusion,
            html_url: run.workflow_run.html_url,
            run_id: run.workflow_run.id,
            last_updated: message.timestamp,
          });
        }
      }
    });

    // Convert to array format
    const summaries: BranchCommitSummary[] = [];
    workflowsByBranchCommit.forEach((workflows, key) => {
      const [branch, commit_sha] = key.split(":");
      summaries.push({
        branch,
        commit_sha,
        commit_short: commit_sha.substring(0, 7),
        workflows: Array.from(workflows.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      });
    });

    return summaries.sort((a, b) => {
      // Sort by most recent activity
      const aLatest = Math.max(
        ...a.workflows.map((w) => new Date(w.last_updated).getTime()),
      );
      const bLatest = Math.max(
        ...b.workflows.map((w) => new Date(w.last_updated).getTime()),
      );
      return bLatest - aLatest;
    });
  }

  // Get status color classes
  private getStatusColor(status: string, conclusion: string | null): string {
    if (conclusion === "success")
      return "bg-green-600/10 dark:bg-green-400/10 text-green-600 dark:text-green-400 border-green-600/20 dark:border-green-400/20";
    if (conclusion === "failure")
      return "bg-red-600/10 dark:bg-red-400/10 text-red-600 dark:text-red-400 border-red-600/20 dark:border-red-400/20";
    if (status === "in_progress")
      return "bg-yellow-600/10 dark:bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 border-yellow-600/20 dark:border-yellow-400/20";
    if (status === "queued")
      return "bg-gray-600/10 dark:bg-gray-400/10 text-gray-600 dark:text-gray-400 border-gray-600/20 dark:border-gray-400/20";
    return "bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-600/20 dark:border-blue-400/20";
  }

  // Get status icon
  private getStatusIcon(
    status: string,
    conclusion: string | null,
  ): TemplateResult {
    if (conclusion === "success") {
      return html`<svg
        class="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M20 6L9 17l-5-5"></path>
      </svg>`;
    }
    if (conclusion === "failure") {
      return html`<svg
        class="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
    }
    if (status === "in_progress") {
      return html`<svg
        class="w-3 h-3 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 12a9 9 0 11-6.219-8.56"></path>
      </svg>`;
    }
    return html`<svg
      class="w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="12" cy="12" r="10"></circle>
    </svg>`;
  }

  // Format timestamp for display
  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      ", " +
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    );
  }

  // Badge layout with details/summary (horizontal row of badges with expandable events)
  private renderBadges(summary: BranchCommitSummary): TemplateResult {
    return html`
      <details class="my-2">
        <summary class="cursor-pointer list-none">
          <div class="flex flex-wrap items-center gap-2 rounded-lg">
            <svg
              class="details-chevron w-4 h-4 text-gray-500 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${summary.workflows.map(
                (workflow) => html`
                  <span
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${this.getStatusColor(
                      workflow.status,
                      workflow.conclusion,
                    )}"
                  >
                    ${this.getStatusIcon(workflow.status, workflow.conclusion)}
                    <span
                      ><a target="_blank" href="${workflow.html_url}"
                        >${workflow.name}</a
                      ></span
                    >
                  </span>
                `,
              )}
            </div>
          </div>
        </summary>
        <div
          class="mt-3 ml-6 space-y-1 text-sm text-gray-600 dark:text-gray-400"
        >
          ${summary.events?.map(
            (event) => html`
              <div class="flex items-center gap-3 py-1">
                <span class="font-mono text-xs text-gray-500 min-w-[180px]"
                  >${this.formatTimestamp(event.timestamp!)}</span
                >
                <span class="font-medium min-w-[120px]"
                  >${event.workflow_name || event.name}</span
                >
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${this.getStatusColor(
                    event.status,
                    event.conclusion,
                  )}"
                >
                  ${event.conclusion ? event.conclusion : event.status}
                </span>
              </div>
            `,
          ) || ""}
        </div>
      </details>
      <style>
        details[open] .details-chevron {
          transform: rotate(90deg);
        }
      </style>
    `;
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("messages")) {
      this.summaries = this.aggregateWorkflowDataWithEvents();
    }
  }

  render() {
    if (this.summaries.length === 0) {
      return html``;
    }

    const filteredSummaries = this.summaries.filter((summary) => {
      if (this.branch && summary.branch !== this.branch) return false;
      if (this.commit && !summary.commit_sha.startsWith(this.commit))
        return false;
      return true;
    });

    if (filteredSummaries.length === 0) {
      return html`<div class="text-sm text-gray-500 italic">
        No matching workflow runs
      </div>`;
    }

    return html`
      <div class="space-y-3">
        ${filteredSummaries.map((summary) => {
          return this.renderBadges(summary);
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-workflow-status-summary": SketchWorkflowStatusSummary;
  }
}
