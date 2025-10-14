import { State, AgentMessage, Usage, Port } from "../types";
import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { formatNumber } from "../utils";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import "./sketch-push-button";

@customElement("sketch-container-status")
export class SketchContainerStatus extends SketchTailwindElement {
  // Header bar: Container status details

  @property()
  state: State;

  @state()
  showDetails: boolean = false;

  @state()
  lastCommit: { hash: string; pushedBranch?: string } | null = null;

  @state()
  lastCommitCopied: boolean = false;

  @state()
  latestUsage: Usage | null = null;

  @state()
  showPortsPopup: boolean = false;

  @state()
  previousPorts: Port[] = [];

  @state()
  highlightedPorts: Set<number> = new Set();

  // CSS animations that can't be easily replaced with Tailwind
  connectedCallback() {
    super.connectedCallback();
    // Add custom CSS animations to the document head if not already present
    if (!document.querySelector("#container-status-animations")) {
      const style = document.createElement("style");
      style.id = "container-status-animations";
      style.textContent = `
        @keyframes pulse-custom {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pulse-custom {
          animation: pulse-custom 1.5s ease-in-out;
          background-color: rgba(38, 132, 255, 0.1);
          border-radius: 3px;
        }
      `;
      document.head.appendChild(style);
    }
  }

  constructor() {
    super();
    this._toggleInfoDetails = this._toggleInfoDetails.bind(this);

    // Close the info panel when clicking outside of it
    document.addEventListener("click", (event) => {
      if (this.showDetails && !this.contains(event.target as Node)) {
        this.showDetails = false;
        this.requestUpdate();
      }
      // Close the ports popup when clicking outside of it
      if (this.showPortsPopup && !this.contains(event.target as Node)) {
        this.showPortsPopup = false;
        this.requestUpdate();
      }
    });
  }

  /**
   * Toggle the display of detailed information
   */
  private _toggleInfoDetails(event: Event) {
    event.stopPropagation();
    this.showDetails = !this.showDetails;
    this.requestUpdate();
  }

  /**
   * Update the last commit information based on messages
   */
  public updateLastCommitInfo(newMessages: AgentMessage[]): void {
    if (!newMessages || newMessages.length === 0) return;

    // Process messages in chronological order (latest last)
    for (const message of newMessages) {
      if (
        message.type === "commit" &&
        message.commits &&
        message.commits.length > 0
      ) {
        // Get the first commit from the list
        const commit = message.commits[0];
        if (commit) {
          // Check if the commit hash has changed
          const hasChanged =
            !this.lastCommit || this.lastCommit.hash !== commit.hash;

          this.lastCommit = {
            hash: commit.hash,
            pushedBranch: commit.pushed_branch,
          };
          this.lastCommitCopied = false;

          // Add pulse animation if the commit changed
          if (hasChanged) {
            // Find the last commit element
            setTimeout(() => {
              const lastCommitEl = this.querySelector(".last-commit-main");
              if (lastCommitEl) {
                // Add the pulse class
                lastCommitEl.classList.add("pulse-custom");

                // Remove the pulse class after animation completes
                setTimeout(() => {
                  lastCommitEl.classList.remove("pulse-custom");
                }, 1500);
              }
            }, 0);
          }
        }
      }
    }
  }

  /**
   * Copy commit info to clipboard when clicked
   */
  private copyCommitInfo(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.lastCommit) return;

    const textToCopy =
      this.lastCommit.pushedBranch || this.lastCommit.hash.substring(0, 8);

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        this.lastCommitCopied = true;
        // Reset the copied state after 1.5 seconds
        setTimeout(() => {
          this.lastCommitCopied = false;
        }, 1500);
      })
      .catch((err) => {
        console.error("Failed to copy commit info:", err);
      });
  }

  formatHostname() {
    // Only display outside hostname
    const outsideHostname = this.state?.outside_hostname;

    if (!outsideHostname) {
      return this.state?.hostname;
    }

    return outsideHostname;
  }

  formatWorkingDir() {
    // Only display outside working directory
    const outsideWorkingDir = this.state?.outside_working_dir;

    if (!outsideWorkingDir) {
      return this.state?.working_dir;
    }

    return outsideWorkingDir;
  }

  getHostnameTooltip() {
    const outsideHostname = this.state?.outside_hostname;
    const insideHostname = this.state?.inside_hostname;

    if (
      !outsideHostname ||
      !insideHostname ||
      outsideHostname === insideHostname
    ) {
      return "";
    }

    return `Outside: ${outsideHostname}, Inside: ${insideHostname}`;
  }

  getWorkingDirTooltip() {
    const outsideWorkingDir = this.state?.outside_working_dir;
    const insideWorkingDir = this.state?.inside_working_dir;

    if (
      !outsideWorkingDir ||
      !insideWorkingDir ||
      outsideWorkingDir === insideWorkingDir
    ) {
      return "";
    }

    return `Outside: ${outsideWorkingDir}, Inside: ${insideWorkingDir}`;
  }

  copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Could add a temporary success indicator here
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
      });
  }

  getSSHHostname() {
    // Use the ssh_connection_string from the state if available, otherwise fall back to generating it
    return (
      this.state?.ssh_connection_string || `sketch-${this.state?.session_id}`
    );
  }

  getSSHConnectionString() {
    // Return the connection string for VS Code remote SSH
    const connectionString =
      this.state?.ssh_connection_string || `sketch-${this.state?.session_id}`;
    // If the connection string already contains user@, use it as-is
    // Otherwise prepend root@ for VS Code remote SSH
    if (connectionString.includes("@")) {
      return connectionString;
    } else {
      return `root@${connectionString}`;
    }
  }

  /**
   * Get sorted ports (by port number) from state, filtering out ports < 1024
   */
  getSortedPorts(): Port[] {
    if (!this.state?.open_ports) {
      return [];
    }
    return [...this.state.open_ports]
      .filter((port) => port.port >= 1024)
      .sort((a, b) => a.port - b.port);
  }

  /**
   * Generate URL for a port based on skaband_addr or localhost
   */
  getPortUrl(port: number): string {
    if (this.state?.skaband_addr) {
      // Use skaband proxy pattern: skabandaddr/proxy/<sessionId>/<port>
      return `${this.state.skaband_addr}/proxy/${this.state.session_id}/${port}`;
    } else {
      // Use localhost pattern: http://p{port}.localhost:{sketch_port}
      // We need to extract the port from the current URL
      const currentPort = window.location.port || "80";
      return `http://p${port}.localhost:${currentPort}`;
    }
  }

  /**
   * Handle port link clicks
   *
   * TODO: Whereas Chrome resolves *.localhost as localhost,
   * Safari does not. Ideally, if skaband_addr is empty, we
   * could do a quick "fetch(p${port}.localhost)", and, if it
   * doesn't work at all, we could show the user a modal explaining
   * to use /etc/hosts. But, anyway, this would be nice but isn't done.
   */
  onPortClick(port: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const url = this.getPortUrl(port);
    window.open(url, "_blank");
  }

  /**
   * Show more ports popup
   */
  private _showMorePorts(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.showPortsPopup = !this.showPortsPopup;
    this.requestUpdate();
  }

  /**
   * Update port tracking and highlight newly opened ports
   */
  public updatePortInfo(newPorts: Port[]): void {
    const currentPorts = newPorts.filter((port) => port.port >= 1024);
    const previousPortNumbers = new Set(this.previousPorts.map((p) => p.port));

    // Find newly opened ports
    const newlyOpenedPorts = currentPorts.filter(
      (port) => !previousPortNumbers.has(port.port),
    );

    if (newlyOpenedPorts.length > 0) {
      // Add newly opened ports to highlighted set
      newlyOpenedPorts.forEach((port) => {
        this.highlightedPorts.add(port.port);
      });

      // Remove highlights after animation completes
      setTimeout(() => {
        newlyOpenedPorts.forEach((port) => {
          this.highlightedPorts.delete(port.port);
        });
        this.requestUpdate();
      }, 1500);
    }

    this.previousPorts = [...currentPorts];
    this.requestUpdate();
  }

  // Format GitHub repository URL to org/repo format
  formatGitHubRepo(url) {
    if (!url) return null;

    // Common GitHub URL patterns
    const patterns = [
      // HTTPS URLs
      /https:\/\/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?$/,
      // SSH URLs
      /git@github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?$/,
      // Git protocol
      /git:\/\/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?$/,
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
  getGitHubBranchLink(branchName) {
    if (!this.state?.link_to_github || !branchName) {
      return null;
    }

    const github = this.formatGitHubRepo(this.state?.git_origin);
    if (!github) {
      return null;
    }

    return `https://github.com/${github.owner}/${github.repo}/tree/${branchName}`;
  }

  renderSSHSection() {
    // Only show SSH section if we're in a Docker container and have session ID
    if (!this.state?.session_id) {
      return html``;
    }

    const _sshHost = this.getSSHHostname();
    const sshConnectionString = this.getSSHConnectionString();
    const sshCommand = `ssh ${sshConnectionString}`;
    const vscodeCommand = `code --remote ssh-remote+${sshConnectionString} /app -n`;
    const vscodeURL = `vscode://vscode-remote/ssh-remote+${sshConnectionString}/app?windowId=_blank`;

    if (!this.state?.ssh_available) {
      return html`
        <div
          class="mt-2.5 pt-2.5 border-t border-gray-300 dark:border-neutral-600"
        >
          <h3>Connect to Container</h3>
          <div
            class="bg-orange-50 dark:bg-orange-900 border-l-4 border-orange-500 dark:border-orange-400 p-3 mt-2 text-xs text-orange-800 dark:text-orange-200"
          >
            SSH connections are not available:
            ${this.state?.ssh_error || "SSH configuration is missing"}
          </div>
        </div>
      `;
    }

    return html`
      <div
        class="mt-2.5 pt-2.5 border-t border-gray-300 dark:border-neutral-600"
      >
        <h3>Connect to Container</h3>
        <div class="flex items-center mb-2 gap-2.5">
          <div
            class="font-mono text-xs bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-neutral-100 flex-grow"
          >
            ${sshCommand}
          </div>
          <button
            class="bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-neutral-100 cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-neutral-600"
            @click=${() => this.copyToClipboard(sshCommand)}
          >
            Copy
          </button>
        </div>
        <div class="flex items-center mb-2 gap-2.5">
          <div
            class="font-mono text-xs bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-neutral-100 flex-grow"
          >
            ${vscodeCommand}
          </div>
          <button
            class="bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-neutral-100 cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-neutral-600"
            @click=${() => this.copyToClipboard(vscodeCommand)}
          >
            Copy
          </button>
        </div>
        <div class="flex items-center mb-2 gap-2.5">
          <a
            href="${vscodeURL}"
            class="text-white no-underline bg-blue-500 px-2 py-1 rounded flex items-center gap-1.5 text-xs transition-colors hover:bg-blue-800"
            title="${vscodeURL}"
          >
            <svg
              class="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M16.5 9.4 7.55 4.24a.35.35 0 0 0-.41.01l-1.23.93a.35.35 0 0 0-.14.29v13.04c0 .12.07.23.17.29l1.24.93c.13.1.31.09.43-.01L16.5 14.6l-6.39 4.82c-.16.12-.38.12-.55.01l-1.33-1.01a.35.35 0 0 1-.14-.28V5.88c0-.12.07-.23.18-.29l1.23-.93c.14-.1.32-.1.46 0l6.54 4.92-6.54 4.92c-.14.1-.32.1-.46 0l-1.23-.93a.35.35 0 0 1-.18-.29V5.88c0-.12.07-.23.17-.29l1.33-1.01c.16-.12.39-.11.55.01l6.39 4.81z"
              />
            </svg>
            <span>Open in VSCode</span>
          </a>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="flex items-center relative">
        <!-- Main visible info in two columns - github/hostname/dir and last commit -->
        <div class="flex flex-wrap gap-2 px-2.5 py-1 flex-1">
          <div class="flex gap-2.5 w-full">
            <!-- First column: GitHub repo (or hostname) and working dir -->
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
                ${(() => {
                  const github = this.formatGitHubRepo(this.state?.git_origin);
                  if (github) {
                    return html`
                      <a
                        href="${github.url}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="github-link text-blue-600 dark:text-blue-400 no-underline hover:underline"
                        title="${this.state?.git_origin}"
                      >
                        ${github.formatted}
                      </a>
                    `;
                  } else {
                    return html`
                      <span
                        id="hostname"
                        class="text-xs font-semibold break-all cursor-default"
                        title="${this.getHostnameTooltip()}"
                      >
                        ${this.formatHostname()}
                      </span>
                    `;
                  }
                })()}
              </div>
              <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
                <span
                  id="workingDir"
                  class="text-xs font-semibold break-all cursor-default"
                  title="${this.getWorkingDirTooltip()}"
                >
                  ${this.formatWorkingDir()}
                </span>
              </div>
            </div>

            <!-- Second column: Last Commit -->
            <div
              class="flex flex-col gap-0.5 justify-start"
              style="${this.lastCommit ? "" : "display: none;"}"
            >
              <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
                <span
                  class="text-xs text-gray-600 dark:text-gray-300 font-medium"
                  >Last Commit</span
                >
              </div>
              <div
                class="flex items-center whitespace-nowrap mr-2.5 text-xs cursor-pointer relative pt-0 last-commit-main hover:text-blue-600"
                @click=${(e: MouseEvent) => this.copyCommitInfo(e)}
                title="Click to copy"
              >
                ${this.lastCommit
                  ? this.lastCommit.pushedBranch
                    ? (() => {
                        const githubLink = this.getGitHubBranchLink(
                          this.lastCommit.pushedBranch,
                        );
                        return html`
                          <div class="flex items-center gap-1.5">
                            <span
                              class="text-green-600 dark:text-green-400 font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis"
                              title="Click to copy: ${this.lastCommit
                                .pushedBranch}"
                              @click=${(e) => this.copyCommitInfo(e)}
                              >${this.lastCommit.pushedBranch}</span
                            >
                            <span
                              class="ml-1 opacity-70 flex items-center hover:opacity-100"
                            >
                              ${this.lastCommitCopied
                                ? html`<svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="align-middle"
                                  >
                                    <path d="M20 6L9 17l-5-5"></path>
                                  </svg>`
                                : html`<svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
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
                                  </svg>`}
                            </span>
                            ${githubLink
                              ? html`<a
                                  href="${githubLink}"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="text-gray-600 dark:text-gray-300 no-underline flex items-center transition-colors hover:text-blue-600"
                                  title="Open ${this.lastCommit
                                    .pushedBranch} on GitHub"
                                  @click=${(e) => e.stopPropagation()}
                                >
                                  <svg
                                    class="w-4 h-4"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                  >
                                    <path
                                      fill="currentColor"
                                      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                                    />
                                  </svg>
                                </a>`
                              : ""}
                          </div>
                        `;
                      })()
                    : html`<span
                        class="text-gray-600 dark:text-gray-300 font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis"
                        >${this.lastCommit.hash.substring(0, 8)}</span
                      >`
                  : html`<span
                      class="text-gray-500 dark:text-gray-400 italic text-xs"
                      >N/A</span
                    >`}
              </div>
            </div>
          </div>
        </div>

        <!-- Ports section -->
        ${(() => {
          const ports = this.getSortedPorts();
          if (ports.length === 0) {
            return html``;
          }
          return html`
            <div class="flex items-center gap-1 ml-2">
              ${ports.length > 0
                ? html`
                    <button
                      class="text-xs whitespace-nowrap bg-gray-100 dark:bg-neutral-800 dark:hover:bg-gray-700 hover:bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors ${ports.some(
                        (port) => this.highlightedPorts.has(port.port),
                      )
                        ? "pulse-custom"
                        : ""}"
                      @click=${(e: MouseEvent) => this._showMorePorts(e)}
                      title="Show ${ports.length} more ports"
                    >
                      🔗 ${ports.length}
                    </button>
                  `
                : html``}
            </div>
          `;
        })()}

        <!-- Push button -->
        <sketch-push-button class="ml-2"></sketch-push-button>

        <!-- Info toggle button -->
        <button
          class="info-toggle ml-2 w-6 h-6 rounded-full flex items-center justify-center ${this
            .showDetails
            ? "bg-blue-500 text-white border-blue-600"
            : "bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-400 border-gray-300 dark:border-neutral-600"} border cursor-pointer font-bold italic transition-all hover:${this
            .showDetails
            ? "bg-blue-600"
            : "bg-gray-200 dark:bg-neutral-600"}"
          @click=${this._toggleInfoDetails}
          title="Show/hide details"
        >
          i
        </button>

        <!-- Expanded info panel -->
        <div
          class="${this.showDetails
            ? "block"
            : "hidden"} absolute min-w-max top-full z-100 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg p-4 shadow-lg mt-1.5"
          style="left: 50%; transform: translateX(-50%);"
        >
          <!-- Last Commit section moved to main grid -->

          <div
            class="grid gap-2 mt-2.5"
            style="grid-template-columns: auto auto"
          >
            <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
              <span
                class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                >Commit:</span
              >
              <span
                id="initialCommit"
                class="text-xs font-semibold break-all text-gray-900 dark:text-neutral-100"
                >${this.state?.initial_commit?.substring(0, 8)}</span
              >
            </div>
            <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
              <span
                class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                >Msgs:</span
              >
              <span
                id="messageCount"
                class="text-xs font-semibold break-all text-gray-900 dark:text-neutral-100"
                >${this.state?.message_count}</span
              >
            </div>
            <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
              <span
                class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                >Session ID:</span
              >
              <span
                id="sessionId"
                class="text-xs font-semibold break-all text-gray-900 dark:text-neutral-100"
                >${this.state?.session_id || "N/A"}</span
              >
            </div>
            <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
              <span
                class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                >Hostname:</span
              >
              <span
                id="hostnameDetail"
                class="text-xs font-semibold break-all cursor-default text-gray-900 dark:text-neutral-100"
                title="${this.getHostnameTooltip()}"
              >
                ${this.formatHostname()}
              </span>
            </div>
            ${this.state?.agent_state
              ? html`
                  <div
                    class="flex items-center whitespace-nowrap mr-2.5 text-xs"
                  >
                    <span
                      class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                      >Agent State:</span
                    >
                    <span
                      id="agentState"
                      class="text-xs font-semibold break-all text-gray-900 dark:text-neutral-100"
                      >${this.state?.agent_state}</span
                    >
                  </div>
                `
              : ""}
            <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
              <span
                class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                >Input tokens:</span
              >
              <span
                id="inputTokens"
                class="text-xs font-semibold break-all text-gray-900 dark:text-neutral-100"
                >${formatNumber(
                  (this.state?.total_usage?.input_tokens || 0) +
                    (this.state?.total_usage?.cache_read_input_tokens || 0) +
                    (this.state?.total_usage?.cache_creation_input_tokens || 0),
                )}</span
              >
            </div>
            <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
              <span
                class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                >Context Window:</span
              >
              <span
                id="contextWindow"
                class="text-xs font-semibold break-all text-gray-900 dark:text-neutral-100"
                >${formatNumber(
                  (this.latestUsage?.input_tokens || 0) +
                    (this.latestUsage?.cache_read_input_tokens || 0) +
                    (this.latestUsage?.cache_creation_input_tokens || 0),
                )}/${formatNumber(this.state?.token_context_window || 0)}</span
              >
            </div>
            ${this.state?.model
              ? html`
                  <div
                    class="flex items-center whitespace-nowrap mr-2.5 text-xs"
                  >
                    <span
                      class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                      >Model:</span
                    >
                    <span
                      id="modelName"
                      class="text-xs font-semibold break-all text-gray-900 dark:text-neutral-100"
                      >${this.state?.model}</span
                    >
                  </div>
                `
              : ""}
            <div class="flex items-center whitespace-nowrap mr-2.5 text-xs">
              <span
                class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                >Output tokens:</span
              >
              <span
                id="outputTokens"
                class="text-xs font-semibold break-all text-gray-900 dark:text-neutral-100"
                >${formatNumber(this.state?.total_usage?.output_tokens)}</span
              >
            </div>
            ${(this.state?.total_usage?.total_cost_usd || 0) > 0
              ? html`
                  <div
                    class="flex items-center whitespace-nowrap mr-2.5 text-xs"
                  >
                    <span
                      class="text-xs text-gray-600 dark:text-neutral-400 mr-1 font-medium"
                      >Total cost:</span
                    >
                    <span
                      id="totalCost"
                      class="text-xs font-semibold break-all text-gray-900 dark:text-neutral-100"
                      >$${(
                        this.state?.total_usage?.total_cost_usd ?? 0
                      ).toFixed(2)}</span
                    >
                  </div>
                `
              : ""}
            <div
              class="flex items-center whitespace-nowrap mr-2.5 text-xs col-span-full mt-1.5 border-t border-gray-300 dark:border-neutral-600 pt-1.5"
            >
              <a href="debug/logs" class="text-blue-600">Logs</a> (<a
                href="download"
                class="text-blue-600"
                >Download</a
              >)
            </div>
          </div>

          <!-- SSH Connection Information -->
          ${this.renderSSHSection()}
        </div>

        <!-- Ports popup -->
        <div
          class="${this.showPortsPopup
            ? "block"
            : "hidden"} absolute min-w-max top-full right-0 z-20 bg-white dark:bg-neutral-800 rounded-lg p-3 shadow-lg mt-1.5 border border-gray-200 dark:border-neutral-600"
        >
          <h3 class="text-sm font-semibold mb-2">Open Ports</h3>
          <div class="flex flex-col gap-1">
            ${this.getSortedPorts().map(
              (port) => html`
                <button
                  class="text-xs bg-gray-100 dark:bg-neutral-800 dark:hover:bg-gray-700 hover:bg-gray-200 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors flex items-center gap-2 justify-between"
                  @click=${(e: MouseEvent) => this.onPortClick(port.port, e)}
                  title="Open ${port.process} on port ${port.port}"
                >
                  <span>${port.process}(${port.port})</span>
                  <span>🔗</span>
                </button>
              `,
            )}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-container-status": SketchContainerStatus;
  }
}
