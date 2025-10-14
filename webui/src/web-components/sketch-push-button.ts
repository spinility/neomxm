import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { SketchTailwindElement } from "./sketch-tailwind-element.js";
import type { Remote } from "../types.js";

@customElement("sketch-push-button")
export class SketchPushButton extends SketchTailwindElement {
  @state()
  private _modalOpen = false;

  @state()
  private _loading = false;

  @state()
  private _pushingAction: "dry-run" | "push" | null = null;

  @state()
  private _headCommit: { hash: string; subject: string } | null = null;

  @state()
  private _remotes: Remote[] = [];

  @state()
  private _selectedRemote = "";

  @state()
  private _branch = "";

  @state()
  private _pushResult: {
    success: boolean;
    output: string;
    error?: string;
    dry_run: boolean;
  } | null = null;

  private async _openModal() {
    this._modalOpen = true;
    this._loading = true;
    this._pushResult = null;

    try {
      // Fetch push info (HEAD commit and remotes)
      const response = await fetch("./git/pushinfo");
      if (response.ok) {
        const data = await response.json();
        this._headCommit = {
          hash: data.hash,
          subject: data.subject,
        };
        this._remotes = data.remotes;

        // Auto-select first remote if available
        if (this._remotes.length > 0) {
          this._selectedRemote = this._remotes[0].name;
        }
      }
    } catch (error) {
      console.error("Error fetching git data:", error);
    } finally {
      this._loading = false;
    }
  }

  private _closeModal() {
    this._modalOpen = false;
    this._pushResult = null;
  }

  private _clickOutsideHandler = (event: MouseEvent) => {
    if (this._modalOpen && !this.contains(event.target as Node)) {
      this._closeModal();
    }
  };

  // Close the modal when clicking outside
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this._clickOutsideHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this._clickOutsideHandler);
  }

  private async _handlePush(dryRun: boolean = false, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    if (!this._selectedRemote || !this._branch || !this._headCommit) {
      return;
    }

    this._loading = true;
    this._pushingAction = dryRun ? "dry-run" : "push";

    try {
      const response = await fetch("./git/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          remote: this._selectedRemote,
          branch: this._branch,
          commit: this._headCommit.hash,
          dry_run: dryRun,
        }),
      });

      if (response.ok) {
        this._pushResult = await response.json();
      } else {
        this._pushResult = {
          success: false,
          output: "",
          error: `HTTP ${response.status}: ${response.statusText}`,
          dry_run: dryRun,
        };
      }
    } catch (error) {
      this._pushResult = {
        success: false,
        output: "",
        error: `Network error: ${error}`,
        dry_run: dryRun,
      };
    } finally {
      this._loading = false;
      this._pushingAction = null;
    }
  }

  private _handleRebase(event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    // Send message to chat asking agent to rebase
    const message = `fetch and rebase onto ${this._selectedRemote}/${this._branch}; force tag ${this._selectedRemote}/${this._branch} as the new sketch-base`;

    // Dispatch custom event to send message to chat
    const chatEvent = new CustomEvent("push-rebase-request", {
      detail: { message },
      bubbles: true,
      composed: true,
    });

    window.dispatchEvent(chatEvent);
  }

  private _formatRemoteDisplay(remote: Remote): string {
    return `${remote.display_name} (${remote.name})`;
  }

  private _renderRemoteDisplay(remote: Remote) {
    const displayText = this._formatRemoteDisplay(remote);
    if (remote.is_github) {
      const githubURL = `https://github.com/${remote.display_name}`;
      if (githubURL) {
        return html`<a
          href="${githubURL}"
          target="_blank"
          class="text-blue-600 hover:text-blue-800 underline"
          >${displayText}</a
        >`;
      }
    }
    return html`<span>${displayText}</span>`;
  }

  private _makeLinksClickable(output: string): string {
    // Regex to match http:// or https:// URLs
    return output.replace(/(https?:\/\/[^\s]+)/g, (match) => {
      // Clean up URL (remove trailing punctuation)
      const cleanURL = match.replace(/[.,!?;]+$/, "");
      const trailingPunctuation = match.substring(cleanURL.length);
      return `<a href="${cleanURL}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">${cleanURL}</a>${trailingPunctuation}`;
    });
  }

  private _getSelectedRemote(): Remote | null {
    return this._remotes.find((r) => r.name === this._selectedRemote) || null;
  }

  private _computeBranchURL(): string {
    const selectedRemote = this._getSelectedRemote();
    if (!selectedRemote || !selectedRemote.is_github) {
      return "";
    }
    return `https://github.com/${selectedRemote?.display_name}/tree/${this._branch}`;
  }

  private _renderRemoteSelection() {
    if (this._remotes.length === 0) {
      return html``;
    }

    if (this._remotes.length === 1) {
      // Single remote - just show it, no selection needed
      const remote = this._remotes[0];
      if (!this._selectedRemote) {
        this._selectedRemote = remote.name;
      }
      return html`
        <div class="mb-3">
          <label
            class="block text-xs font-medium mb-1 text-gray-900 dark:text-neutral-100"
            >Remote:</label
          >
          <div
            class="p-2 bg-gray-50 dark:bg-neutral-700 rounded text-xs text-gray-700 dark:text-neutral-300"
          >
            ${this._renderRemoteDisplay(remote)}
          </div>
        </div>
      `;
    }

    if (this._remotes.length === 2) {
      // Two remotes - use radio buttons
      return html`
        <div class="mb-3">
          <label
            class="block text-xs font-medium mb-1 text-gray-900 dark:text-neutral-100"
            >Remote:</label
          >
          <div class="space-y-2">
            ${this._remotes.map(
              (remote) => html`
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="remote"
                    .value=${remote.name}
                    .checked=${remote.name === this._selectedRemote}
                    ?disabled=${this._loading}
                    @change=${(e: Event) => {
                      this._selectedRemote = (
                        e.target as HTMLInputElement
                      ).value;
                    }}
                    class="text-blue-600 dark:text-blue-400 focus:ring-blue-500 bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600"
                  />
                  <span class="text-xs text-gray-700 dark:text-neutral-300"
                    >${this._renderRemoteDisplay(remote)}</span
                  >
                </label>
              `,
            )}
          </div>
        </div>
      `;
    }

    // Three or more remotes - use dropdown
    return html`
      <div class="mb-3">
        <label
          class="block text-xs font-medium mb-1 text-gray-900 dark:text-neutral-100"
          >Remote:</label
        >
        <select
          .value=${this._selectedRemote}
          ?disabled=${this._loading}
          @change=${(e: Event) => {
            this._selectedRemote = (e.target as HTMLSelectElement).value;
          }}
          class="w-full p-2 border border-gray-300 dark:border-neutral-600 rounded text-xs bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a remote...</option>
          ${this._remotes.map(
            (remote) => html`
              <option
                value="${remote.name}"
                ?selected=${remote.name === this._selectedRemote}
              >
                ${this._formatRemoteDisplay(remote)}
              </option>
            `,
          )}
        </select>
      </div>
    `;
  }

  render() {
    return html`
      <div class="relative">
        <!-- Push Button -->
        <button
          @click=${this._openModal}
          class="flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-white rounded transition-colors"
          title="Open dialog box for pushing changes"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          <span class="max-sm:hidden">Push</span>
        </button>

        <!-- Overlay Popup -->
        <div
          class="${this._modalOpen
            ? "block"
            : "hidden"} absolute top-full z-50 bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-lg mt-1.5 border border-gray-200 dark:border-neutral-600"
          style="width: 420px; left: 50%; transform: translateX(-50%);"
        >
          <div class="flex justify-between items-center mb-3">
            <h3
              class="text-sm font-semibold text-gray-900 dark:text-neutral-100"
            >
              Push to Remote
            </h3>
            <button
              @click=${this._closeModal}
              class="text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          ${this._loading && !this._headCommit
            ? html`
                <div class="text-center py-4">
                  <div
                    class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"
                  ></div>
                  <p class="mt-2 text-gray-600 dark:text-neutral-400 text-xs">
                    Loading...
                  </p>
                </div>
              `
            : html`
                <!-- Current HEAD info -->
                ${this._headCommit
                  ? html`
                      <div
                        class="mb-3 p-2 bg-gray-50 dark:bg-neutral-700 rounded"
                      >
                        <p class="text-xs">
                          <span
                            class="text-gray-600 dark:text-neutral-400 font-mono"
                            >${this._headCommit.hash.substring(0, 8)}</span
                          >
                          <span class="text-gray-800 dark:text-neutral-200 ml-2"
                            >${this._headCommit.subject}</span
                          >
                        </p>
                      </div>
                    `
                  : ""}

                <!-- Remote selection -->
                ${this._renderRemoteSelection()}

                <!-- Branch input -->
                <div class="mb-3">
                  <label
                    class="block text-xs font-medium mb-1 text-gray-900 dark:text-neutral-100"
                    >Branch:</label
                  >
                  <input
                    type="text"
                    .value=${this._branch}
                    ?disabled=${this._loading}
                    @input=${(e: Event) => {
                      this._branch = (e.target as HTMLInputElement).value;
                    }}
                    placeholder="Enter branch name..."
                    class="w-full p-2 border border-gray-300 dark:border-neutral-600 rounded text-xs bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <!-- Action buttons -->
                <div class="flex gap-2 mb-3">
                  <button
                    @click=${(e: Event) => this._handlePush(true, e)}
                    ?disabled=${!this._selectedRemote ||
                    !this._branch ||
                    !this._headCommit ||
                    this._loading}
                    class="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded text-xs transition-colors flex items-center justify-center"
                  >
                    ${this._pushingAction === "dry-run"
                      ? html`
                          <div
                            class="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"
                          ></div>
                        `
                      : ""}
                    Dry Run
                  </button>
                  <button
                    @click=${(e: Event) => this._handlePush(false, e)}
                    ?disabled=${!this._selectedRemote ||
                    !this._branch ||
                    !this._headCommit ||
                    this._loading}
                    class="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded text-xs transition-colors flex items-center justify-center"
                  >
                    ${this._pushingAction === "push"
                      ? html`
                          <div
                            class="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"
                          ></div>
                        `
                      : ""}
                    Push
                  </button>
                </div>

                <!-- Push result -->
                ${this._pushResult
                  ? html`
                      <div
                        class="p-3 rounded ${this._pushResult.success
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"} relative"
                      >
                        ${this._loading
                          ? html`
                              <div
                                class="absolute inset-0 bg-white dark:bg-neutral-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center rounded"
                              >
                                <div
                                  class="flex items-center text-xs text-gray-600 dark:text-neutral-400"
                                >
                                  <div
                                    class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"
                                  ></div>
                                  Processing...
                                </div>
                              </div>
                            `
                          : ""}

                        <div class="flex items-center justify-between mb-2">
                          <p
                            class="text-xs font-medium ${this._pushResult
                              .success
                              ? "text-green-800 dark:text-green-400"
                              : "text-red-800 dark:text-red-400"}"
                          >
                            ${this._pushResult.dry_run ? "Dry Run" : "Push"}
                            ${this._pushResult.success
                              ? "Successful"
                              : "Failed"}
                          </p>
                          ${this._pushResult.success &&
                          !this._pushResult.dry_run
                            ? (() => {
                                const branchURL = this._computeBranchURL();
                                return branchURL
                                  ? html`
                                      <a
                                        href="${branchURL}"
                                        target="_blank"
                                        class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-900 dark:bg-neutral-700 hover:bg-gray-800 dark:hover:bg-neutral-600 text-white rounded transition-colors"
                                      >
                                        <svg
                                          class="w-3 h-3"
                                          viewBox="0 0 24 24"
                                          fill="currentColor"
                                        >
                                          <path
                                            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                                          />
                                        </svg>
                                        Open on GitHub
                                      </a>
                                    `
                                  : "";
                              })()
                            : ""}
                        </div>
                        ${this._pushResult.output
                          ? html`
                              <pre
                                class="text-xs text-gray-700 dark:text-neutral-300 whitespace-pre-wrap font-mono mb-2 break-words"
                                .innerHTML="${this._makeLinksClickable(
                                  this._pushResult.output,
                                )}"
                              ></pre>
                            `
                          : ""}
                        ${this._pushResult.error
                          ? html`
                              <p
                                class="text-xs text-red-700 dark:text-red-400 mb-2"
                              >
                                ${this._pushResult.error}
                              </p>
                            `
                          : ""}

                        <div class="flex gap-2 items-center">
                          ${!this._pushResult.success
                            ? html`
                                <button
                                  @click=${(e: Event) => this._handleRebase(e)}
                                  class="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
                                >
                                  Ask Agent to Rebase
                                </button>
                              `
                            : ""}

                          <button
                            @click=${(e: Event) => {
                              e.stopPropagation();
                              this._closeModal();
                            }}
                            class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors ml-auto"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    `
                  : this._loading
                    ? html`
                        <div
                          class="p-3 rounded bg-gray-50 border border-gray-200"
                        >
                          <div class="flex items-center text-xs text-gray-600">
                            <div
                              class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"
                            ></div>
                            Processing...
                          </div>
                        </div>
                      `
                    : ""}
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-push-button": SketchPushButton;
  }
}
