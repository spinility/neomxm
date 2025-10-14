// sketch-diff-range-picker.ts
// Component for selecting commit range for diffs

import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { GitDataService } from "./git-data-service";
import { GitLogEntry } from "../types";
import { SketchTailwindElement } from "./sketch-tailwind-element";

/**
 * Range type for diff views
 */
export type DiffRange = { type: "range"; from: string; to: string };

/**
 * Component for selecting commit range for diffs
 */
@customElement("sketch-diff-range-picker")
export class SketchDiffRangePicker extends SketchTailwindElement {
  @property({ type: Array })
  commits: GitLogEntry[] = [];

  @state()
  private fromCommit: string = "";

  @state()
  private toCommit: string = "";

  @state()
  private dropdownOpen: boolean = false;

  // Removed commitsExpanded state - always expanded now

  @state()
  private loading: boolean = true;

  @state()
  private error: string | null = null;

  @property({ attribute: false, type: Object })
  gitService!: GitDataService;

  constructor() {
    super();
    console.log("SketchDiffRangePicker initialized");
  }

  // Ensure global styles are injected when component is used
  private ensureGlobalStyles() {
    if (!document.querySelector("#sketch-diff-range-picker-styles")) {
      const floatingMessageStyles = document.createElement("style");
      floatingMessageStyles.id = "sketch-diff-range-picker-styles";
      floatingMessageStyles.textContent = this.getGlobalStylesContent();
      document.head.appendChild(floatingMessageStyles);
    }
  }

  // Get the global styles content
  private getGlobalStylesContent(): string {
    return `
    sketch-diff-range-picker {
      display: block;
      width: 100%;
      font-family: var(--font-family, system-ui, sans-serif);
      color: var(--text-color, #333);
    }`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.ensureGlobalStyles();
    // Wait for DOM to be fully loaded to ensure proper initialization order
    if (document.readyState === "complete") {
      this.loadCommits();
    } else {
      window.addEventListener("load", () => {
        setTimeout(() => this.loadCommits(), 0); // Give time for provider initialization
      });
    }

    // Listen for popstate events to handle browser back/forward navigation
    window.addEventListener("popstate", this.handlePopState.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.handlePopState.bind(this));
  }

  /**
   * Handle browser back/forward navigation
   */
  private handlePopState() {
    // Re-initialize from URL parameters when user navigates
    if (this.commits.length > 0) {
      const initializedFromUrl = this.initializeFromUrlParams();
      if (initializedFromUrl) {
        // Force re-render and dispatch event
        this.requestUpdate();
        this.dispatchRangeEvent();
      }
    }
  }

  render() {
    return html`
      <div class="block w-full font-system text-gray-800 dark:text-neutral-200">
        <div class="flex flex-col gap-3 w-full">
          ${this.loading
            ? html`<div class="italic text-gray-500 dark:text-neutral-400">
                Loading commits...
              </div>`
            : this.error
              ? html`<div class="text-red-600 dark:text-red-400 text-sm">
                  ${this.error}
                </div>`
              : this.renderRangePicker()}
        </div>
      </div>
    `;
  }

  renderRangePicker() {
    return html`
      <div class="flex flex-row items-center gap-3 flex-1">
        ${this.renderRangeSelectors()}
      </div>
    `;
  }

  renderRangeSelectors() {
    // Always diff against uncommitted changes
    this.toCommit = "";

    const selectedCommit = this.commits.find((c) => c.hash === this.fromCommit);
    const isDefaultCommit =
      selectedCommit && this.isSketchBaseCommit(selectedCommit);

    return html`
      <div class="flex items-center gap-2 flex-1 relative">
        <label
          for="fromCommit"
          class="font-medium text-sm text-gray-700 dark:text-neutral-300"
          >Diff from:</label
        >
        <div
          class="relative w-full min-w-[300px]"
          @click=${this.toggleDropdown}
        >
          <button
            class="w-full py-2 px-3 pr-8 border rounded text-left min-h-[36px] text-sm relative cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 ${isDefaultCommit
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
              : "border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500"} focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            @click=${this.toggleDropdown}
            @blur=${this.handleBlur}
          >
            <div class="flex items-center gap-2 pr-6">
              ${selectedCommit
                ? this.renderCommitButton(selectedCommit)
                : "Select commit..."}
            </div>
            <svg
              class="absolute right-2 top-1/2 transform -translate-y-1/2 transition-transform duration-200 ${this
                .dropdownOpen
                ? "rotate-180"
                : ""}"
              width="12"
              height="12"
              viewBox="0 0 12 12"
            >
              <path d="M6 8l-4-4h8z" fill="currentColor" />
            </svg>
          </button>
          ${this.dropdownOpen
            ? html`
                <div
                  class="absolute top-full left-0 right-0 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded shadow-lg z-50 max-h-[300px] overflow-y-auto mt-0.5"
                >
                  ${this.commits.map(
                    (commit) => html`
                      <div
                        class="px-3 py-2.5 cursor-pointer border-b border-gray-100 dark:border-neutral-700 last:border-b-0 flex items-start gap-2 text-sm leading-5 hover:bg-gray-50 dark:hover:bg-neutral-700 ${commit.hash ===
                        this.fromCommit
                          ? "bg-blue-50 dark:bg-blue-900/30"
                          : ""} ${this.isSketchBaseCommit(commit)
                          ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500 pl-2"
                          : ""}"
                        @click=${() => this.selectCommit(commit.hash)}
                      >
                        ${this.renderCommitOption(commit)}
                      </div>
                    `,
                  )}
                </div>
              `
            : ""}
        </div>
      </div>
    `;
  }

  /**
   * Format a commit for display in the dropdown (legacy method, kept for compatibility)
   */
  formatCommitOption(commit: GitLogEntry): string {
    const shortHash = commit.hash.substring(0, 8);

    // Truncate subject if it's too long
    let subject = commit.subject;
    if (subject.length > 50) {
      subject = subject.substring(0, 47) + "...";
    }

    let label = `${shortHash} ${subject}`;

    // Add refs but keep them concise
    if (commit.refs && commit.refs.length > 0) {
      const refs = commit.refs.map((ref) => {
        // Shorten common prefixes
        if (ref.startsWith("origin/")) {
          return ref.substring(7);
        }
        if (ref.startsWith("refs/heads/")) {
          return ref.substring(11);
        }
        if (ref.startsWith("refs/remotes/origin/")) {
          return ref.substring(20);
        }
        return ref;
      });

      // Limit to first 2 refs to avoid overcrowding
      const displayRefs = refs.slice(0, 2);
      if (refs.length > 2) {
        displayRefs.push(`+${refs.length - 2} more`);
      }

      label += ` (${displayRefs.join(", ")})`;
    }

    return label;
  }

  /**
   * Load commits from the Git data service
   */
  async loadCommits() {
    this.loading = true;
    this.error = null;

    if (!this.gitService) {
      console.error("GitService was not provided to sketch-diff-range-picker");
      throw Error();
    }

    try {
      // Get the base commit reference
      const baseCommitRef = await this.gitService.getBaseCommitRef();

      // Load commit history
      this.commits = await this.gitService.getCommitHistory(baseCommitRef);

      // Check if we should initialize from URL parameters first
      const initializedFromUrl = this.initializeFromUrlParams();

      // Set default selections only if not initialized from URL
      if (this.commits.length > 0 && !initializedFromUrl) {
        // For range, default is base to HEAD
        // TODO: is sketch-base right in the unsafe context, where it's sketch-base-...
        // should this be startswith?
        const baseCommit = this.commits.find(
          (c) => c.refs && c.refs.some((ref) => ref.includes("sketch-base")),
        );

        this.fromCommit = baseCommit
          ? baseCommit.hash
          : this.commits[this.commits.length - 1].hash;
        // Default to Uncommitted Changes by setting toCommit to empty string
        this.toCommit = ""; // Empty string represents uncommitted changes
      }

      // Always dispatch range event to ensure diff view is updated
      this.dispatchRangeEvent();
    } catch (error) {
      console.error("Error loading commits:", error);
      this.error = `Error loading commits: ${error.message}`;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Handle From commit change
   */
  handleFromChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.fromCommit = select.value;
    this.dispatchRangeEvent();
  }

  /**
   * Handle To commit change
   */
  handleToChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.toCommit = select.value;
    this.dispatchRangeEvent();
  }

  /**
   * Toggle dropdown open/closed
   */
  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;

    if (this.dropdownOpen) {
      // Close dropdown when clicking outside
      setTimeout(() => {
        document.addEventListener("click", this.closeDropdown, { once: true });
      }, 0);
    }
  }

  /**
   * Close dropdown
   */
  closeDropdown = () => {
    this.dropdownOpen = false;
  };

  /**
   * Handle blur event on select button
   */
  handleBlur(_event: FocusEvent) {
    // Small delay to allow click events to process
    setTimeout(() => {
      if (!this.closest(".custom-select")) {
        this.dropdownOpen = false;
      }
    }, 150);
  }

  /**
   * Select a commit from dropdown
   */
  selectCommit(hash: string) {
    this.fromCommit = hash;
    this.dropdownOpen = false;
    this.dispatchRangeEvent();
  }

  /**
   * Check if a commit is a sketch-base commit
   */
  isSketchBaseCommit(commit: GitLogEntry): boolean {
    return commit.refs?.some((ref) => ref.includes("sketch-base")) || false;
  }

  /**
   * Render commit for the dropdown button
   */
  renderCommitButton(commit: GitLogEntry) {
    const shortHash = commit.hash.substring(0, 8);
    let subject = commit.subject;
    if (subject.length > 40) {
      subject = subject.substring(0, 37) + "...";
    }

    return html`
      <span class="font-mono text-gray-600 dark:text-neutral-400 text-xs"
        >${shortHash}</span
      >
      <span class="text-gray-800 dark:text-neutral-200 text-xs truncate"
        >${subject}</span
      >
      ${this.isSketchBaseCommit(commit)
        ? html`
            <span
              class="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-xs font-semibold"
              >base</span
            >
          `
        : ""}
    `;
  }

  /**
   * Render commit option in dropdown
   */
  renderCommitOption(commit: GitLogEntry) {
    const shortHash = commit.hash.substring(0, 8);
    let subject = commit.subject;
    if (subject.length > 50) {
      subject = subject.substring(0, 47) + "...";
    }

    return html`
      <span class="font-mono text-gray-600 dark:text-neutral-400 text-xs"
        >${shortHash}</span
      >
      <span
        class="text-gray-800 dark:text-neutral-200 text-xs flex-1 truncate min-w-[200px]"
        >${subject}</span
      >
      ${commit.refs && commit.refs.length > 0
        ? html`
            <div class="flex gap-1 flex-wrap">
              ${this.renderRefs(commit.refs)}
            </div>
          `
        : ""}
    `;
  }

  /**
   * Render all refs naturally without truncation
   */
  renderRefs(refs: string[]) {
    return html`
      <div class="flex gap-1 flex-wrap flex-shrink-0">
        ${refs.map((ref) => {
          const shortRef = this.getShortRefName(ref);
          const isSketchBase = ref.includes("sketch-base");
          const refClass = isSketchBase
            ? "bg-blue-600 text-white font-semibold"
            : ref.includes("tag")
              ? "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
              : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
          return html`<span
            class="px-1.5 py-0.5 rounded-full text-xs font-medium ${refClass}"
            >${shortRef}</span
          >`;
        })}
      </div>
    `;
  }

  /**
   * Get shortened reference name for compact display
   */
  getShortRefName(ref: string): string {
    if (ref.startsWith("refs/heads/")) {
      return ref.substring(11);
    }
    if (ref.startsWith("refs/remotes/origin/")) {
      return ref.substring(20);
    }
    if (ref.startsWith("refs/tags/")) {
      return ref.substring(10);
    }
    return ref;
  }

  /**
   * Get a summary of the current commit range for display
   */
  getCommitSummary(): string {
    if (!this.fromCommit && !this.toCommit) {
      return "No commits selected";
    }

    const fromShort = this.fromCommit ? this.fromCommit.substring(0, 8) : "";
    const toShort = this.toCommit
      ? this.toCommit.substring(0, 8)
      : "Uncommitted";

    return `${fromShort}..${toShort}`;
  }

  /**
   * Validate that a commit hash exists in the loaded commits
   */
  private isValidCommitHash(hash: string): boolean {
    if (!hash || hash.trim() === "") return true; // Empty is valid (uncommitted changes)
    return this.commits.some(
      (commit) => commit.hash.startsWith(hash) || commit.hash === hash,
    );
  }

  /**
   * Dispatch range change event and update URL parameters
   */
  dispatchRangeEvent() {
    const range: DiffRange = {
      type: "range",
      from: this.fromCommit,
      to: this.toCommit,
    };

    // Update URL parameters
    this.updateUrlParams(range);

    const event = new CustomEvent("range-change", {
      detail: { range },
      bubbles: true,
      composed: true,
    });

    this.dispatchEvent(event);
  }

  /**
   * Update URL parameters for from and to commits
   */
  private updateUrlParams(range: DiffRange) {
    const url = new URL(window.location.href);

    // Remove existing range parameters
    url.searchParams.delete("from");
    url.searchParams.delete("to");
    url.searchParams.delete("commit");

    // Add from parameter if not empty
    if (range.from && range.from.trim() !== "") {
      url.searchParams.set("from", range.from);
    }
    // Add to parameter if not empty (empty string means uncommitted changes)
    if (range.to && range.to.trim() !== "") {
      url.searchParams.set("to", range.to);
    }

    // Update the browser history without reloading the page
    window.history.replaceState(window.history.state, "", url.toString());
  }

  /**
   * Initialize from URL parameters if available
   */
  private initializeFromUrlParams() {
    const url = new URL(window.location.href);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    // If from or to parameters are present, use them
    if (fromParam || toParam) {
      if (fromParam) {
        this.fromCommit = fromParam;
      }
      if (toParam) {
        this.toCommit = toParam;
      } else {
        // If no 'to' param, default to uncommitted changes (empty string)
        this.toCommit = "";
      }
      return true; // Indicate that we initialized from URL
    }

    return false; // No URL params found
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-diff-range-picker": SketchDiffRangePicker;
  }
}
