/**
 * Demo module for sketch-diff-range-picker component
 */

import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";
import { MockGitDataService } from "./mock-git-data-service";

const demo: DemoModule = {
  title: "Diff Range Picker Demo",
  description: "Component for selecting commit ranges for diff views",
  imports: ["../sketch-diff-range-picker"],

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const basicSection = demoUtils.createDemoSection(
      "Basic Range Picker",
      "Select commit ranges for diff views with dropdown interface",
    );

    const statusSection = demoUtils.createDemoSection(
      "Range Selection Status",
      "Shows the currently selected range and events",
    );

    // Create mock git service
    const mockGitService = new MockGitDataService();

    // Create the component
    const rangePickerElement = document.createElement(
      "sketch-diff-range-picker",
    );
    rangePickerElement.className = `
      w-full max-w-3xl my-5 p-4 border border-gray-300 dark:border-neutral-600
      rounded-lg bg-white dark:bg-neutral-800
    `;

    // Set up the git service
    (rangePickerElement as any).gitService = mockGitService;

    // Create status display
    const statusDisplay = document.createElement("div");
    statusDisplay.className = `
      p-3 my-4 bg-gray-50 dark:bg-neutral-800 rounded border
      border-gray-200 dark:border-neutral-700 font-mono text-sm leading-relaxed
    `;
    statusDisplay.innerHTML = `
      <div><strong>Status:</strong> No range selected</div>
      <div><strong>Events:</strong> None</div>
    `;

    // Listen for range change events
    rangePickerElement.addEventListener("range-change", (event: any) => {
      const range = event.detail.range;
      const fromShort = range.from ? range.from.substring(0, 8) : "N/A";
      const toShort = range.to ? range.to.substring(0, 8) : "Uncommitted";

      statusDisplay.innerHTML = `
        <div><strong>Status:</strong> Range selected</div>
        <div><strong>From:</strong> ${fromShort}</div>
        <div><strong>To:</strong> ${toShort}</div>
        <div><strong>Events:</strong> range-change fired at ${new Date().toLocaleTimeString()}</div>
      `;
    });

    // Add components to sections
    basicSection.appendChild(rangePickerElement);
    statusSection.appendChild(statusDisplay);

    // Add sections to container
    container.appendChild(basicSection);
    container.appendChild(statusSection);

    // Add some demo instructions
    const instructionsDiv = document.createElement("div");
    instructionsDiv.className = `
      my-5 p-4 bg-blue-50 dark:bg-blue-900/20 rounded
      border-l-4 border-blue-500 dark:border-blue-400
    `;
    instructionsDiv.innerHTML = `
      <h3 style="margin: 0 0 8px 0; color: #1976d2;">Demo Instructions:</h3>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Click on the dropdown to see available commits</li>
        <li>Select different commits to see range changes</li>
        <li>The component defaults to diffing against uncommitted changes</li>
        <li>Watch the status display for real-time event updates</li>
      </ul>
    `;
    container.appendChild(instructionsDiv);
  },

  cleanup: () => {
    // Clean up any event listeners or resources if needed
    console.log("Cleaning up sketch-diff-range-picker demo");
  },
};

export default demo;
