import { AgentMessage } from "../types";
import type { WorkflowRunEvent } from "@octokit/webhooks-types";

export interface WorkflowEventGroup {
  commitSha: string;
  commitShort: string;
  branch: string;
  events: AgentMessage[];
  firstEventIndex: number;
  commitMessageIndex?: number; // Index of commit message if it exists
  lastUpdated: string;
}

export interface WorkflowEvent extends CustomEvent {
  detail: {
    groups: Map<string, WorkflowEventGroup>;
    changedKeys?: string[];
  };
}

export class WorkflowEventTracker extends EventTarget {
  private eventGroups = new Map<string, WorkflowEventGroup>();

  private notify(changedKeys?: string[]) {
    this.dispatchEvent(
      new CustomEvent("groupsUpdated", {
        detail: {
          groups: this.eventGroups,
          changedKeys,
        },
      }) as WorkflowEvent,
    );
  }

  // Process timeline messages to extract workflow events and commits
  processMessages(messages: AgentMessage[]) {
    const changedKeys = new Set<string>();

    // First pass: identify commits
    const commitMap = new Map<string, number>();
    messages.forEach((message, index) => {
      if (message.commits && message.commits.length > 0) {
        message.commits.forEach((commit) => {
          if (commit) {
            commitMap.set(commit.hash, index);
          }
        });
      }
    });

    // Second pass: group workflow events
    messages.forEach((message, index) => {
      if (this.isWorkflowEvent(message)) {
        const workflowData = message.external_message!.body as WorkflowRunEvent;
        const commitSha = workflowData.workflow_run.head_sha;
        const branch = workflowData.workflow_run.head_branch;
        const key = `${branch}:${commitSha}`;
        changedKeys.add(key);

        if (!this.eventGroups.has(key)) {
          this.eventGroups.set(key, {
            commitSha,
            commitShort: commitSha.substring(0, 7),
            branch,
            events: [],
            firstEventIndex: index,
            commitMessageIndex: commitMap.get(commitSha),
            lastUpdated: message.timestamp,
          });
        }

        const group = this.eventGroups.get(key)!;
        group.events.push(message);

        // Update first event index if this is earlier
        if (index < group.firstEventIndex) {
          group.firstEventIndex = index;
        }

        // Update last updated time if this is more recent
        if (new Date(message.timestamp) > new Date(group.lastUpdated)) {
          group.lastUpdated = message.timestamp;
        }
      }
    });

    if (changedKeys.size > 0) {
      this.notify(Array.from(changedKeys));
    }
  }

  private isWorkflowEvent(message: AgentMessage): boolean {
    return (
      message.type === "external" &&
      message.external_message?.message_type === "github_workflow_run"
    );
  }

  // Get the index where a workflow summary should be placed
  getSummaryPlacement(group: WorkflowEventGroup): number {
    // Prefer commit message location, fallback to first event
    return group.commitMessageIndex ?? group.firstEventIndex;
  }

  // Check if a message should be hidden (it's part of a workflow group)
  shouldHideMessage(message: AgentMessage, messageIndex: number): boolean {
    if (!this.isWorkflowEvent(message)) return false;

    // Find the group this message belongs to
    for (const group of this.eventGroups.values()) {
      const summaryIndex = this.getSummaryPlacement(group);

      // Hide if this message is part of a group AND it's not at the summary location
      if (group.events.includes(message) && messageIndex !== summaryIndex) {
        return true;
      }
    }

    return false;
  }

  // Get workflow summary data for a specific message index
  getWorkflowSummaryForIndex(messageIndex: number): WorkflowEventGroup | null {
    for (const group of this.eventGroups.values()) {
      if (this.getSummaryPlacement(group) === messageIndex) {
        return group;
      }
    }
    return null;
  }

  getEventGroups(): Map<string, WorkflowEventGroup> {
    return this.eventGroups;
  }
}

// Global singleton instance
export const workflowEventTracker = new WorkflowEventTracker();

// Type declarations for better TypeScript support
declare global {
  interface GlobalEventHandlersEventMap {
    groupsUpdated: WorkflowEvent;
  }
}
