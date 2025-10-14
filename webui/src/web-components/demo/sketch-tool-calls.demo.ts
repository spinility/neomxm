/**
 * Demo module for sketch-tool-calls component
 */

import { DemoModule } from "./demo-framework/types";
import {
  demoUtils,
  sampleToolCalls,
  multipleToolCallGroups,
  longBashCommand,
} from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Tool Calls Demo",
  description: "Interactive tool call display with various tool types",
  imports: ["../sketch-tool-calls"],

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const basicSection = demoUtils.createDemoSection(
      "Basic Tool Calls",
      "Various types of tool calls with results",
    );

    const interactiveSection = demoUtils.createDemoSection(
      "Interactive Examples",
      "Tool calls that can be modified and updated",
    );

    const groupsSection = demoUtils.createDemoSection(
      "Tool Call Groups",
      "Multiple tool calls grouped together",
    );

    // Basic tool calls component
    const basicToolCalls = document.createElement("sketch-tool-calls") as any;
    basicToolCalls.toolCalls = sampleToolCalls.slice(0, 3);

    // Interactive tool calls component
    const interactiveToolCalls = document.createElement(
      "sketch-tool-calls",
    ) as any;
    interactiveToolCalls.toolCalls = [sampleToolCalls[0]];

    // Control buttons for interaction
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = "margin-top: 15px;";

    const addBashButton = demoUtils.createButton("Add Bash Command", () => {
      const currentCalls = interactiveToolCalls.toolCalls || [];
      interactiveToolCalls.toolCalls = [...currentCalls, sampleToolCalls[2]];
    });

    const addLongCommandButton = demoUtils.createButton(
      "Add Long Command",
      () => {
        const currentCalls = interactiveToolCalls.toolCalls || [];
        interactiveToolCalls.toolCalls = [...currentCalls, longBashCommand];
      },
    );

    const clearButton = demoUtils.createButton("Clear Tool Calls", () => {
      interactiveToolCalls.toolCalls = [];
    });

    const resetButton = demoUtils.createButton("Reset to Default", () => {
      interactiveToolCalls.toolCalls = [sampleToolCalls[0]];
    });

    controlsDiv.appendChild(addBashButton);
    controlsDiv.appendChild(addLongCommandButton);
    controlsDiv.appendChild(clearButton);
    controlsDiv.appendChild(resetButton);

    // Tool call groups
    const groupsContainer = document.createElement("div");
    multipleToolCallGroups.forEach((group, index) => {
      const groupHeader = document.createElement("h4");
      groupHeader.textContent = `Group ${index + 1}`;
      groupHeader.style.cssText =
        "margin: 20px 0 10px 0; color: var(--demo-label-color);";

      const groupToolCalls = document.createElement("sketch-tool-calls") as any;
      groupToolCalls.toolCalls = group;

      groupsContainer.appendChild(groupHeader);
      groupsContainer.appendChild(groupToolCalls);
    });

    // Progressive loading demo
    const progressiveSection = demoUtils.createDemoSection(
      "Progressive Loading Demo",
      "Tool calls that appear one by one",
    );

    const progressiveToolCalls = document.createElement(
      "sketch-tool-calls",
    ) as any;
    progressiveToolCalls.toolCalls = [];

    const startProgressiveButton = demoUtils.createButton(
      "Start Progressive Load",
      async () => {
        progressiveToolCalls.toolCalls = [];

        for (let i = 0; i < sampleToolCalls.length; i++) {
          await demoUtils.delay(1000);
          const currentCalls = progressiveToolCalls.toolCalls || [];
          progressiveToolCalls.toolCalls = [
            ...currentCalls,
            sampleToolCalls[i],
          ];
        }
      },
    );

    const progressiveControls = document.createElement("div");
    progressiveControls.style.cssText = "margin-top: 15px;";
    progressiveControls.appendChild(startProgressiveButton);

    // Assemble the demo
    basicSection.appendChild(basicToolCalls);

    interactiveSection.appendChild(interactiveToolCalls);
    interactiveSection.appendChild(controlsDiv);

    groupsSection.appendChild(groupsContainer);

    progressiveSection.appendChild(progressiveToolCalls);
    progressiveSection.appendChild(progressiveControls);

    container.appendChild(basicSection);
    container.appendChild(interactiveSection);
    container.appendChild(groupsSection);
    container.appendChild(progressiveSection);
  },
};

export default demo;
