import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { SketchTailwindElement } from "./sketch-tailwind-element";

@customElement("mobile-chat-input")
export class MobileChatInput extends SketchTailwindElement {
  @property({ type: Boolean })
  disabled = false;

  @state()
  private inputValue = "";

  @state()
  private uploadsInProgress = 0;

  @state()
  private showUploadProgress = false;

  private textareaRef = createRef<HTMLTextAreaElement>();

  private handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    this.inputValue = target.value;
    this.adjustTextareaHeight();
  };

  private handlePaste = async (e: ClipboardEvent) => {
    // Check if the clipboard contains files
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];

      // Handle the file upload
      e.preventDefault(); // Prevent default paste behavior

      // Get the current cursor position
      const textarea = this.textareaRef.value;
      const cursorPos = textarea
        ? textarea.selectionStart
        : this.inputValue.length;
      await this.uploadFile(file, cursorPos);
    }
  };

  // Utility function to handle file uploads
  private async uploadFile(file: File, insertPosition: number) {
    // Insert a placeholder at the cursor position
    const textBefore = this.inputValue.substring(0, insertPosition);
    const textAfter = this.inputValue.substring(insertPosition);

    // Add a loading indicator
    const loadingText = `[🔄 Uploading ${file.name}...]`;
    this.inputValue = `${textBefore}${loadingText}${textAfter}`;

    // Increment uploads in progress counter
    this.uploadsInProgress++;
    this.showUploadProgress = true;

    // Adjust spacing immediately to show loading indicator
    this.adjustTextareaHeight();

    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", file);

      // Upload the file to the server using a relative path
      const response = await fetch("./upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Replace the loading placeholder with the actual file path
      this.inputValue = this.inputValue.replace(loadingText, `[${data.path}]`);

      return data.path;
    } catch (error) {
      console.error("Failed to upload file:", error);

      // Replace loading indicator with error message
      const errorText = `[Upload failed: ${error.message}]`;
      this.inputValue = this.inputValue.replace(loadingText, errorText);

      throw error;
    } finally {
      // Always decrement the counter, even if there was an error
      this.uploadsInProgress--;
      if (this.uploadsInProgress === 0) {
        this.showUploadProgress = false;
      }
      this.adjustTextareaHeight();
      if (this.textareaRef.value) {
        this.textareaRef.value.focus();
      }
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  };

  private adjustTextareaHeight() {
    if (this.textareaRef.value) {
      const textarea = this.textareaRef.value;
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }

  private sendMessage = () => {
    // Prevent sending if there are uploads in progress
    if (this.uploadsInProgress > 0) {
      console.log(
        `Message send prevented: ${this.uploadsInProgress} uploads in progress`,
      );
      return;
    }

    const message = this.inputValue.trim();
    if (message && !this.disabled) {
      this.dispatchEvent(
        new CustomEvent("send-message", {
          detail: { message },
          bubbles: true,
          composed: true,
        }),
      );

      this.inputValue = "";
      if (this.textareaRef.value) {
        this.textareaRef.value.value = "";
        this.adjustTextareaHeight();
        this.textareaRef.value.focus();
      }
    }
  };

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    this.adjustTextareaHeight();

    // Add paste event listener when component updates
    if (this.textareaRef.value && !this.textareaRef.value.onpaste) {
      this.textareaRef.value.addEventListener("paste", this.handlePaste);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up paste event listener
    if (this.textareaRef.value) {
      this.textareaRef.value.removeEventListener("paste", this.handlePaste);
    }
  }

  render() {
    const canSend =
      this.inputValue.trim().length > 0 &&
      !this.disabled &&
      this.uploadsInProgress === 0;

    return html`
      <div
        class="block bg-white border-t border-gray-200 dark:bg-neutral-800 dark:border-gray-700 p-3 relative z-[1000]"
        style="padding-bottom: max(12px, env(safe-area-inset-bottom)); padding-left: max(16px, env(safe-area-inset-left)); padding-right: max(16px, env(safe-area-inset-right));"
      >
        <div class="flex items-end gap-3 max-w-full">
          <div class="flex-1 relative min-w-0">
            <textarea
              ${ref(this.textareaRef)}
              .value=${this.inputValue}
              @input=${this.handleInput}
              @keydown=${this.handleKeyDown}
              placeholder="Message Sketch..."
              ?disabled=${this.disabled || this.uploadsInProgress > 0}
              rows="1"
              class="w-full min-h-[40px] max-h-[120px] p-3 border border-gray-300 dark:border-gray-600 rounded-[20px] text-base font-inherit leading-relaxed resize-none outline-none bg-gray-50 dark:bg-neutral-800 transition-colors duration-200 box-border focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed placeholder:text-gray-500"
              style="font-size: 16px;"
            ></textarea>

            ${this.showUploadProgress
              ? html`
                  <div
                    class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-50 text-yellow-800 px-2 py-1 rounded text-xs whitespace-nowrap shadow-sm z-[1000]"
                  >
                    Uploading ${this.uploadsInProgress}
                    file${this.uploadsInProgress > 1 ? "s" : ""}...
                  </div>
                `
              : ""}
          </div>

          <button
            class="flex-shrink-0 w-10 h-10 border-none rounded-full bg-blue-500 text-white cursor-pointer flex items-center justify-center text-lg transition-all duration-200 outline-none hover:bg-blue-600 active:scale-95 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
            @click=${this.sendMessage}
            ?disabled=${!canSend}
            title=${this.uploadsInProgress > 0
              ? "Please wait for upload to complete"
              : "Send message"}
          >
            ${this.uploadsInProgress > 0
              ? html`<span class="text-xs">⏳</span>`
              : html`<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                </svg>`}
          </button>
        </div>
      </div>
    `;
  }
}
