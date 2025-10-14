import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  GitDiffFile,
  GitDataService,
  DefaultGitDataService,
} from "./git-data-service";
import "./sketch-monaco-view";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import { css } from "lit";

@customElement("mobile-diff")
export class MobileDiff extends SketchTailwindElement {
  static styles = [
    SketchTailwindElement.styles || [],
    css`
      /* Make Monaco editor gutters smaller on mobile */
      :host sketch-monaco-view {
        --monaco-gutter-width: 32px;
      }

      :host .monaco-editor .margin {
        width: 32px !important;
      }

      :host .monaco-editor .glyph-margin {
        width: 16px !important;
      }

      :host .monaco-editor .line-numbers {
        font-size: 11px !important;
        width: 24px !important;
      }
    `,
  ];
  @property({ attribute: false, type: Object })
  gitService: GitDataService = new DefaultGitDataService();

  @state()
  private files: GitDiffFile[] = [];

  @state()
  private fileContents: Map<
    string,
    { original: string; modified: string; editable: boolean }
  > = new Map();

  @state()
  private loading: boolean = false;

  @state()
  private error: string | null = null;

  @state()
  private baseCommit: string = "";

  @state()
  private selectedFile: string = "";

  @state()
  private inlineView: boolean = true; // Default to inline for mobile

  connectedCallback() {
    super.connectedCallback();
    this.loadDiffData();
  }

  private async loadDiffData() {
    this.loading = true;
    this.error = null;
    this.files = [];
    this.fileContents.clear();

    try {
      // Get base commit reference
      this.baseCommit = await this.gitService.getBaseCommitRef();

      // Get diff from base commit to working directory
      this.files = await this.gitService.getDiff(this.baseCommit, "");

      // Ensure files is always an array
      if (!this.files) {
        this.files = [];
      }

      if (this.files.length > 0) {
        // Auto-select the first file if none is selected
        if (!this.selectedFile) {
          this.selectedFile = this.files[0].path;
        }
        await this.loadAllFileContents();
      }
    } catch (error) {
      console.error("Error loading diff data:", error);
      this.error = `Error loading diff: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.files = [];
    } finally {
      this.loading = false;
    }
  }

  private async loadAllFileContents() {
    try {
      const promises = this.files.map(async (file) => {
        try {
          let originalCode = "";
          let modifiedCode = "";
          const editable = true; // Mobile diff always shows working directory changes

          // Load original content (from the base commit)
          if (file.status !== "A") {
            originalCode = await this.gitService.getFileContent(
              file.old_hash || "",
            );
          }

          // Load modified content (from working directory)
          if (file.status === "D") {
            modifiedCode = "";
          } else {
            try {
              modifiedCode = await this.gitService.getWorkingCopyContent(
                file.path,
              );
            } catch (error) {
              console.warn(
                `Could not get working copy for ${file.path}:`,
                error,
              );
              modifiedCode = "";
            }
          }

          this.fileContents.set(file.path, {
            original: originalCode,
            modified: modifiedCode,
            editable: editable && file.status !== "D", // Don't make deleted files editable
          });
        } catch (error) {
          console.error(`Error loading content for file ${file.path}:`, error);
          this.fileContents.set(file.path, {
            original: "",
            modified: "",
            editable: false,
          });
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error("Error loading file contents:", error);
      throw error;
    }
  }

  private getFileStatusTailwindClass(status: string): string {
    switch (status.toUpperCase()) {
      case "A":
        return "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-300";
      case "M":
        return "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-300";
      case "D":
        return "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-300";
      case "R":
      default:
        if (status.toUpperCase().startsWith("R")) {
          return "bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-300";
        }
        return "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-300";
    }
  }

  private getFileStatusText(status: string): string {
    switch (status.toUpperCase()) {
      case "A":
        return "Added";
      case "M":
        return "Modified";
      case "D":
        return "Deleted";
      case "R":
      default:
        if (status.toUpperCase().startsWith("R")) {
          return "Renamed";
        }
        return "Modified";
    }
  }

  private getChangesInfo(file: GitDiffFile): string {
    const additions = file.additions || 0;
    const deletions = file.deletions || 0;

    if (additions === 0 && deletions === 0) {
      return "";
    }

    const parts = [];
    if (additions > 0) {
      parts.push(`+${additions}`);
    }
    if (deletions > 0) {
      parts.push(`-${deletions}`);
    }

    return `(${parts.join(", ")})`;
  }

  private getPathInfo(file: GitDiffFile): string {
    if (file.old_path && file.old_path !== "") {
      return `${file.old_path} → ${file.path}`;
    }
    return file.path;
  }

  private getFileDisplayNameWithStats(file: GitDiffFile): string {
    const status = this.getFileStatusText(file.status);
    const pathInfo = this.getPathInfo(file);
    const changesInfo = this.getChangesInfo(file);

    if (changesInfo) {
      return `${status}: ${pathInfo} ${changesInfo}`;
    }
    return `${status}: ${pathInfo}`;
  }

  private getTruncatedFileDisplayName(file: GitDiffFile): string {
    const status = this.getFileStatusText(file.status);
    const pathInfo = this.getPathInfo(file);
    const changesInfo = this.getChangesInfo(file);

    // Truncate the path if it's too long
    const maxPathLength = 25;
    let displayPath = pathInfo;
    if (pathInfo.length > maxPathLength) {
      const parts = pathInfo.split("/");
      if (parts.length > 1) {
        // Keep the filename and truncate the directory path
        const filename = parts[parts.length - 1];
        const remainingLength = maxPathLength - filename.length - 3; // 3 for "..."
        if (remainingLength > 0) {
          const dirPath = parts.slice(0, -1).join("/");
          if (dirPath.length > remainingLength) {
            displayPath = `...${dirPath.slice(dirPath.length - remainingLength)}/${filename}`;
          } else {
            displayPath = pathInfo;
          }
        } else {
          displayPath = `...${filename}`;
        }
      } else {
        displayPath =
          pathInfo.length > maxPathLength
            ? `...${pathInfo.slice(-maxPathLength + 3)}`
            : pathInfo;
      }
    }

    // Create a more compact display
    const statusChar = status.charAt(0); // M, A, D, R
    if (changesInfo) {
      return `${statusChar}: ${displayPath} ${changesInfo}`;
    }
    return `${statusChar}: ${displayPath}`;
  }

  private handleFileSelection(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedFile = selectElement.value;
    this.requestUpdate();
  }

  private toggleViewMode() {
    this.inlineView = !this.inlineView;
    this.requestUpdate();
  }

  // Comments disabled for mobile diff to save space and simplify UI

  /**
   * Handle save events from the Monaco editor
   */
  private async handleMonacoSave(event: CustomEvent) {
    try {
      if (
        !event.detail ||
        !event.detail.path ||
        event.detail.content === undefined
      ) {
        console.error("Invalid save data received");
        return;
      }

      const { path, content } = event.detail;
      const monacoView = this.querySelector("sketch-monaco-view");
      if (!monacoView) {
        console.error("Monaco view not found");
        return;
      }

      try {
        await this.gitService?.saveFileContent(path, content);
        console.log(`File saved: ${path}`);
        (monacoView as any).notifySaveComplete(true);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        alert(`Failed to save changes to ${path}:\n\n${errorMessage}`);
        (monacoView as any).notifySaveComplete(false);
      }
    } catch (error) {
      console.error("Error handling save:", error);
    }
  }

  private renderFileSelector() {
    const fileCount = this.files.length;

    return html`
      <select
        class="flex-1 px-2 py-1.5 border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-neutral-800 text-sm cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-100 dark:disabled:bg-neutral-700 disabled:text-gray-500 dark:disabled:text-gray-300 disabled:cursor-not-allowed truncate"
        .value="${this.selectedFile}"
        @change="${this.handleFileSelection}"
        ?disabled="${fileCount === 0}"
        style="max-width: calc(100% - 120px);"
      >
        ${fileCount === 0 ? html`<option value="">No files</option>` : ""}
        ${this.files.map(
          (file) => html`
            <option
              value="${file.path}"
              title="${this.getFileDisplayNameWithStats(file)}"
            >
              ${this.getTruncatedFileDisplayName(file)}
            </option>
          `,
        )}
      </select>
    `;
  }

  private renderViewToggle() {
    return html`
      <button
        class="px-2 py-1.5 border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-neutral-800 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 flex items-center gap-1.5 flex-shrink-0"
        @click="${this.toggleViewMode}"
        title="${this.inlineView
          ? "Switch to side-by-side view"
          : "Switch to inline view"}"
      >
        ${this.inlineView
          ? html`
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <rect x="1" y="2" width="14" height="2" rx="1" />
                <rect x="1" y="6" width="14" height="2" rx="1" />
                <rect x="1" y="10" width="14" height="2" rx="1" />
              </svg>
              Split
            `
          : html`
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <rect x="1" y="2" width="6" height="12" rx="1" />
                <rect x="9" y="2" width="6" height="12" rx="1" />
              </svg>
              Inline
            `}
      </button>
    `;
  }

  private renderSingleFileView() {
    const selectedFileData = this.files.find(
      (f) => f.path === this.selectedFile,
    );
    if (!selectedFileData) {
      return html`<div class="text-red-600 p-4">Selected file not found</div>`;
    }

    const content = this.fileContents.get(this.selectedFile);
    if (!content) {
      return html`<div class="flex items-center justify-center h-full">
        Loading ${this.selectedFile}...
      </div>`;
    }

    return html`
      <div class="flex-1 flex flex-col min-h-0">
        <sketch-monaco-view
          class="flex-1 w-full min-h-0"
          .originalCode="${content.original}"
          .modifiedCode="${content.modified}"
          .originalFilename="${selectedFileData.path}"
          .modifiedFilename="${selectedFileData.path}"
          ?readOnly="${!content.editable}"
          ?editable-right="${content.editable}"
          ?inline="${this.inlineView}"
          ?disable-comments="true"
          @monaco-save="${this.handleMonacoSave}"
          data-file-path="${selectedFileData.path}"
        ></sketch-monaco-view>
      </div>
    `;
  }

  render() {
    return html`
      <div
        class="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-neutral-900"
      >
        <!-- Header with file selector and view toggle -->
        <div
          class="px-3 py-1.5 border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-neutral-800 flex-shrink-0"
        >
          <div class="flex items-center gap-2">
            ${this.renderFileSelector()}
            ${this.files.length > 0 ? this.renderViewToggle() : ""}
          </div>
        </div>

        <!-- Content area -->
        <div class="flex-1 overflow-auto flex flex-col min-h-0 relative h-full">
          ${this.loading
            ? html`<div
                class="flex items-center justify-center h-full text-base text-gray-500 dark:text-gray-300 text-center p-5"
              >
                Loading diff...
              </div>`
            : this.error
              ? html`<div
                  class="flex items-center justify-center h-full text-base text-red-600 dark:text-red-400 text-center p-5"
                >
                  ${this.error}
                </div>`
              : !this.files || this.files.length === 0
                ? html`<div
                    class="flex items-center justify-center h-full text-base text-gray-500 dark:text-gray-300 text-center p-5"
                  >
                    No changes to show
                  </div>`
                : this.selectedFile
                  ? this.renderSingleFileView()
                  : html`<div
                      class="flex items-center justify-center h-full text-gray-600 dark:text-gray-300"
                    >
                      <div class="text-center">
                        <div class="text-lg mb-2">Select a file to view</div>
                        <div class="text-sm">
                          Use the file picker above to choose a file to display
                        </div>
                      </div>
                    </div>`}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-diff": MobileDiff;
  }
}
