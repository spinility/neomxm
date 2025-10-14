/**
 * Demo module for sketch-container-status component
 */

import { DemoModule } from "./demo-framework/types";
import {
  demoUtils,
  sampleContainerState,
  lightUsageState,
  heavyUsageState,
} from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Container Status Demo",
  description: "Display container status information with usage statistics",
  imports: ["../sketch-container-status"],
  styles: ["/dist/tailwind.css"],

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const basicSection = demoUtils.createDemoSection(
      "Basic Container Status",
      "Shows current container state with usage information",
    );

    const variationsSection = demoUtils.createDemoSection(
      "Usage Variations",
      "Different usage levels and states",
    );

    // Basic status component
    const basicStatus = document.createElement(
      "sketch-container-status",
    ) as any;
    basicStatus.id = "basic-status";
    basicStatus.state = sampleContainerState;

    // Light usage status
    const lightStatus = document.createElement(
      "sketch-container-status",
    ) as any;
    lightStatus.id = "light-status";
    lightStatus.state = lightUsageState;

    const lightLabel = document.createElement("h4");
    lightLabel.textContent = "Light Usage";
    lightLabel.style.cssText =
      "margin: 20px 0 10px 0; color: var(--demo-label-color);";

    // Heavy usage status
    const heavyStatus = document.createElement(
      "sketch-container-status",
    ) as any;
    heavyStatus.id = "heavy-status";
    heavyStatus.state = heavyUsageState;
    heavyStatus.lastCommit = {
      hash: "deadbeef",
      pushedBranch: "user/sketch/really-long-branch-name-that-stains-layout",
    };
    const heavyLabel = document.createElement("h4");
    heavyLabel.textContent = "Heavy Usage";
    heavyLabel.style.cssText =
      "margin: 20px 0 10px 0; color: var(--demo-label-color);";

    // Control buttons for interaction
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = "margin-top: 20px;";

    const updateBasicButton = demoUtils.createButton(
      "Update Basic Status",
      () => {
        const updatedState = {
          ...sampleContainerState,
          message_count: sampleContainerState.message_count + 1,
          total_usage: {
            ...sampleContainerState.total_usage!,
            messages: sampleContainerState.total_usage!.messages + 1,
            total_cost_usd: Number(
              (sampleContainerState.total_usage!.total_cost_usd + 0.05).toFixed(
                2,
              ),
            ),
          },
        };
        basicStatus.state = updatedState;
      },
    );

    const toggleSSHButton = demoUtils.createButton("Toggle SSH Status", () => {
      const currentState = basicStatus.state;
      basicStatus.state = {
        ...currentState,
        ssh_available: !currentState.ssh_available,
        ssh_error: currentState.ssh_available ? "Connection failed" : undefined,
      };
    });

    const resetButton = demoUtils.createButton("Reset to Defaults", () => {
      basicStatus.state = sampleContainerState;
      lightStatus.state = lightUsageState;
      heavyStatus.state = heavyUsageState;
    });

    controlsDiv.appendChild(updateBasicButton);
    controlsDiv.appendChild(toggleSSHButton);
    controlsDiv.appendChild(resetButton);

    // Assemble the demo
    basicSection.appendChild(basicStatus);
    basicSection.appendChild(controlsDiv);

    variationsSection.appendChild(lightLabel);
    variationsSection.appendChild(lightStatus);
    variationsSection.appendChild(heavyLabel);
    variationsSection.appendChild(heavyStatus);

    container.appendChild(basicSection);
    container.appendChild(variationsSection);

    // Add some real-time updates
    const updateInterval = setInterval(() => {
      const states = [basicStatus, lightStatus, heavyStatus];
      states.forEach((status) => {
        if (status.state) {
          const updatedState = {
            ...status.state,
            message_count:
              status.state.message_count + Math.floor(Math.random() * 2),
          };
          if (Math.random() > 0.7) {
            // 30% chance to update
            status.state = updatedState;
          }
        }
      });
    }, 3000);

    // Store interval for cleanup
    (container as any).demoInterval = updateInterval;
  },

  cleanup: async () => {
    // Clear any intervals
    const container = document.getElementById("demo-container");
    if (container && (container as any).demoInterval) {
      clearInterval((container as any).demoInterval);
      delete (container as any).demoInterval;
    }
  },
};

export default demo;
