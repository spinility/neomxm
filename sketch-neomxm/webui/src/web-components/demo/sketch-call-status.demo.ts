/**
 * Demo module for sketch-call-status component
 */

import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Call Status Demo",
  description: "Display DISCONNECTED status when the session is disconnected",
  imports: ["../sketch-call-status"],
  styles: ["/dist/tailwind.css"],

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const statusVariationsSection = demoUtils.createDemoSection(
      "Status Variations",
      "Different states of the call status component",
    );

    const interactiveSection = demoUtils.createDemoSection(
      "Interactive Demo",
      "Toggle connection status to see the component behavior",
    );

    // Helper function to create status component with state
    const createStatusComponent = (
      id: string,
      isDisconnected: boolean,
      label: string,
    ) => {
      const wrapper = document.createElement("div");
      wrapper.className =
        "my-4 p-3 border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800";

      const labelEl = document.createElement("h4");
      labelEl.textContent = label;
      labelEl.style.cssText =
        "margin: 0 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

      const statusComponent = document.createElement(
        "sketch-call-status",
      ) as any;
      statusComponent.id = id;
      statusComponent.isDisconnected = isDisconnected;

      wrapper.appendChild(labelEl);
      wrapper.appendChild(statusComponent);
      return wrapper;
    };

    // Create status variations
    const connectedStatus = createStatusComponent(
      "connected-status",
      false,
      "Connected State - Component is hidden",
    );

    const disconnectedStatus = createStatusComponent(
      "disconnected-status",
      true,
      "Disconnected State - Shows DISCONNECTED indicator",
    );

    // Interactive demo component
    const interactiveStatus = document.createElement(
      "sketch-call-status",
    ) as any;
    interactiveStatus.id = "interactive-status";
    interactiveStatus.isDisconnected = false;

    // Control buttons for interactive demo
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText =
      "margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px;";

    const toggleConnectionButton = demoUtils.createButton(
      "Toggle Connection",
      () => {
        interactiveStatus.isDisconnected = !interactiveStatus.isDisconnected;
      },
    );

    controlsDiv.appendChild(toggleConnectionButton);

    // Assemble the demo
    statusVariationsSection.appendChild(connectedStatus);
    statusVariationsSection.appendChild(disconnectedStatus);

    const interactiveWrapper = document.createElement("div");
    interactiveWrapper.className =
      "p-3 border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800";
    interactiveWrapper.appendChild(interactiveStatus);
    interactiveWrapper.appendChild(controlsDiv);
    interactiveSection.appendChild(interactiveWrapper);

    container.appendChild(statusVariationsSection);
    container.appendChild(interactiveSection);
  },

  cleanup: async () => {
    // No cleanup needed for this simplified demo
  },
};

export default demo;
