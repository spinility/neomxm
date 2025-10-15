import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { MockGitDataService } from "./mock-git-data-service.js";
import "../sketch-push-button.js";
import { SketchTailwindElement } from "../sketch-tailwind-element.js";

@customElement("sketch-push-button-demo")
export class SketchPushButtonDemo extends SketchTailwindElement {
  @state()
  private _gitDataService = new MockGitDataService();

  render() {
    return html`
      <div
        class="p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 max-w-md mx-auto"
      >
        <h2
          class="text-lg font-semibold mb-4 text-gray-900 dark:text-neutral-100"
        >
          Push Button Demo
        </h2>

        <div class="mb-4">
          <p class="text-sm text-gray-600 dark:text-neutral-300 mb-2">
            Test the push button component:
          </p>
          <sketch-push-button></sketch-push-button>
        </div>

        <div class="text-xs text-gray-500 dark:text-neutral-400">
          <p>Click the push button to test:</p>
          <ul class="list-disc list-inside mt-1">
            <li>Modal opens with git information</li>
            <li>Input fields can be disabled during loading</li>
            <li>Buttons show individual spinners</li>
            <li>No full modal overwrite during operations</li>
          </ul>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-push-button-demo": SketchPushButtonDemo;
  }
}
