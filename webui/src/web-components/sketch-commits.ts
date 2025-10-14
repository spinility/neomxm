import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AgentMessage, GitCommit, State } from "../types";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import {
  workflowEventTracker,
  WorkflowEventGroup,
  WorkflowEvent,
} from "../services/workflow-event-tracker";
import "./sketch-workflow-status-summary";

@customElement("sketch-commits")
export class SketchCommits extends SketchTailwindElement {
  @property({ type: Array })
  commits: (GitCommit | null)[] | null = null;

  @property({ type: Object })
  state: State | null = null;

  @state()
  workflowGroups = new Map<string, WorkflowEventGroup>();
  private abortController: AbortController | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    // Subscribe to workflow event tracker updates
    this.abortController = new AbortController();
    workflowEventTracker.addEventListener(
      "groupsUpdated",
      this.handleWorkflowEventGroups.bind(this),
      { signal: this.abortController.signal },
    );
    this.handleWorkflowEventGroups({
      detail: {
        groups: workflowEventTracker.getEventGroups(),
        changedKeys: undefined,
      },
    } as WorkflowEvent);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.abortController?.abort();
  }

  handleWorkflowEventGroups(event: WorkflowEvent) {
    const { groups, changedKeys } = event.detail;

    if (!this.commits || this.commits.length === 0) {
      return;
    }
    if (!groups || groups.size === 0) {
      return;
    }

    let hasChanges = false;

    // If this component has any of the commits mentioned in this update,
    // then update the workflow groups affected.
    for (const commit of this.commits) {
      const key = `${commit.pushed_branch}:${commit.hash}`;

      // Skip if this key wasn't changed (when changedKeys is available)
      if (changedKeys && !changedKeys.includes(key)) {
        continue;
      }

      const group = groups.get(key);
      if (group) {
        // This update contains a commit we care about
        const wfg = this.workflowGroups.get(key);
        if (wfg) {
          wfg.events = group.events;
          wfg.lastUpdated = group.lastUpdated;
        } else {
          this.workflowGroups.set(key, group);
        }
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.requestUpdate();
    }
  }

  // Event handlers for copying text and showing commit diffs
  copyToClipboard(text: string, event: Event) {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();

    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.showFloatingMessage("Copied!", rect, "success");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        this.showFloatingMessage("Failed to copy!", rect, "error");
      });
  }

  showCommit(commitHash: string) {
    this.dispatchEvent(
      new CustomEvent("show-commit-diff", {
        bubbles: true,
        composed: true,
        detail: { commitHash },
      }),
    );
  }

  showFloatingMessage(
    message: string,
    targetRect: DOMRect,
    type: "success" | "error",
  ) {
    // Create floating message element
    const floatingMsg = document.createElement("div");
    floatingMsg.textContent = message;
    floatingMsg.className = `floating-message ${type}`;

    // Position it near the clicked element
    // Position just above the element
    const top = targetRect.top - 30;
    const left = targetRect.left + targetRect.width / 2 - 40;

    floatingMsg.style.position = "fixed";
    floatingMsg.style.top = `${top}px`;
    floatingMsg.style.left = `${left}px`;
    floatingMsg.style.zIndex = "9999";

    // Add to document body
    document.body.appendChild(floatingMsg);

    // Animate in
    floatingMsg.style.opacity = "0";
    floatingMsg.style.transform = "translateY(10px)";

    setTimeout(() => {
      floatingMsg.style.opacity = "1";
      floatingMsg.style.transform = "translateY(0)";
    }, 10);

    // Remove after animation
    setTimeout(() => {
      floatingMsg.style.opacity = "0";
      floatingMsg.style.transform = "translateY(-10px)";

      setTimeout(() => {
        if (floatingMsg.parentNode) {
          document.body.removeChild(floatingMsg);
        }
      }, 300);
    }, 1500);
  }

  // Format GitHub repository URL to org/repo format
  formatGitHubRepo(url: string | null) {
    if (!url) return null;

    // Common GitHub URL patterns
    const patterns = [
      // HTTPS URLs
      /https:\/\/github\.com\/([^/]+)\/([^/\s.]+)(?:\.git)?/,
      // SSH URLs
      /git@github\.com:([^/]+)\/([^/\s.]+)(?:\.git)?/,
      // Git protocol
      /git:\/\/github\.com\/([^/]+)\/([^/\s.]+)(?:\.git)?/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          formatted: `${match[1]}/${match[2]}`,
          url: `https://github.com/${match[1]}/${match[2]}`,
          owner: match[1],
          repo: match[2],
        };
      }
    }

    return null;
  }

  // Generate GitHub branch URL if linking is enabled
  getGitHubBranchLink(branchName: string | null) {
    if (!this.state?.link_to_github || !branchName) {
      return null;
    }

    const github = this.formatGitHubRepo(this.state?.git_origin);
    if (!github) {
      return null;
    }

    return `https://github.com/${github.owner}/${github.repo}/tree/${branchName}`;
  }

  private getWorkflowMessages(commit: GitCommit): AgentMessage[] {
    const group = this.workflowGroups.get(
      `${commit.pushed_branch}:${commit.hash}`,
    );
    if (group) {
      return [...group.events];
    }
    return [];
  }

  render() {
    if (!this.commits || this.commits.length === 0) {
      return html``;
    }

    return html`
      <div class="mt-2.5">
        <div
          class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-400 font-medium text-xs py-1.5 px-2.5 rounded-2xl mb-2 text-center shadow-sm"
        >
          ${this.commits.length} new commit${this.commits.length > 1 ? "s" : ""}
          detected
        </div>
        ${this.commits.map((commit) => {
          if (!commit) return html``;
          const wfMessages = this.getWorkflowMessages(commit);
          return html`
            <div
              class="text-sm bg-gray-100 dark:bg-neutral-800 rounded-lg overflow-hidden mb-1.5 shadow-sm p-1.5 px-2 gap-2"
            >
              <div class="flex items-center gap-2">
                <span
                  class="text-blue-600 font-bold font-mono cursor-pointer no-underline bg-blue-600/10 py-0.5 px-1 rounded hover:bg-blue-600/20"
                  title="Click to copy: ${commit.hash}"
                  @click=${(e: Event) =>
                    this.copyToClipboard(commit.hash.substring(0, 8), e)}
                >
                  ${commit.hash.substring(0, 8)}
                </span>
                ${commit.pushed_branch
                  ? (() => {
                      const githubLink = this.getGitHubBranchLink(
                        commit.pushed_branch,
                      );
                      return html`
                        <div class="flex items-center gap-1.5">
                          <span
                            class="text-green-600 font-medium cursor-pointer font-mono bg-green-600/10 py-0.5 px-1 rounded hover:bg-green-600/20"
                            title="Click to copy: ${commit.pushed_branch}"
                            @click=${(e: Event) =>
                              this.copyToClipboard(commit.pushed_branch!, e)}
                            >${commit.pushed_branch}</span
                          >
                          <span
                            class="opacity-70 flex items-center hover:opacity-100"
                            @click=${(e: Event) => {
                              e.stopPropagation();
                              this.copyToClipboard(commit.pushed_branch!, e);
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              class="align-middle"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              ></rect>
                              <path
                                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                              ></path>
                            </svg>
                          </span>
                          ${githubLink
                            ? html`
                                <a
                                  href="${githubLink}"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="text-gray-600 dark:text-neutral-400 no-underline flex items-center transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400"
                                  title="Open ${commit.pushed_branch} on GitHub"
                                  @click=${(e: Event) => e.stopPropagation()}
                                >
                                  <svg
                                    class="w-3.5 h-3.5"
                                    viewBox="0 0 16 16"
                                    width="14"
                                    height="14"
                                  >
                                    <path
                                      fill="currentColor"
                                      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                                    />
                                  </svg>
                                </a>
                              `
                            : ""}
                        </div>
                      `;
                    })()
                  : html``}
                <span
                  class="text-sm text-gray-700 dark:text-neutral-300 flex-grow truncate"
                >
                  ${commit.subject}
                </span>
                <button
                  class="py-0.5 px-2 border-0 rounded bg-blue-600 text-white text-xs cursor-pointer transition-all duration-200 block ml-auto hover:bg-blue-700"
                  @click=${() => this.showCommit(commit.hash)}
                >
                  View Diff
                </button>
              </div>
              <div>
                <sketch-workflow-status-summary
                  .commit=${commit.hash}
                  .branch=${commit.pushed_branch}
                  .messages=${wfMessages}
                ></sketch-workflow-status-summary>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-commits": SketchCommits;
  }
}
