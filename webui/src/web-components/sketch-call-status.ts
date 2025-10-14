import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { SketchTailwindElement } from "./sketch-tailwind-element.js";

@customElement("sketch-call-status")
export class SketchCallStatus extends SketchTailwindElement {
  @property()
  isDisconnected: boolean = false;

  render() {
    // Only show content when disconnected
    if (!this.isDisconnected) {
      return html`<div style="display: none;"></div>`;
    }

    return html`
      <div class="flex items-center px-2.5">
        <div
          class="status-banner py-0.5 px-1.5 rounded text-xs font-bold text-center tracking-wider bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400"
          title="Connection lost or container shut down"
        >
          DISCONNECTED
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-call-status": SketchCallStatus;
  }
}
