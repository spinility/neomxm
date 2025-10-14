import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Status Indicators Demo",
  description:
    "Status indicators showing connected, working, and disconnected states without the green connection dot",
  imports: ["../sketch-call-status.ts"],

  customStyles: `
    .demo-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .status-container {
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 5px;
      background-color: var(--demo-fixture-section-bg);
    }
    .label {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .status-item {
      min-width: 200px;
    }
    .status-view {
      background-color: white;
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 4px;
    }
    .description {
      margin-top: 10px;
      color: var(--demo-secondary-text);
      font-size: 14px;
    }
  `,

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "Status Indicators",
      "Demonstrates the new status indicators without the green connection dot, showing different connection and activity states.",
    );

    const demoContainer = document.createElement("div");
    demoContainer.className = "demo-container";

    // Connected States Container
    const connectedContainer = document.createElement("div");
    connectedContainer.className = "status-container";

    const connectedLabel = document.createElement("div");
    connectedLabel.className = "label";
    connectedLabel.textContent = "Connected States:";
    connectedContainer.appendChild(connectedLabel);

    // IDLE State
    const idleRow = document.createElement("div");
    idleRow.className = "status-row";

    const idleItem = document.createElement("div");
    idleItem.className = "status-item";
    idleItem.textContent = "IDLE:";

    const idleView = document.createElement("div");
    idleView.className = "status-view";

    const idleStatus = document.createElement("sketch-call-status") as any;
    idleStatus.isDisconnected = false;
    idleStatus.isIdle = true;
    idleStatus.llmCalls = 0;
    idleStatus.toolCalls = [];

    const idleDescription = document.createElement("div");
    idleDescription.className = "description";
    idleDescription.textContent = "Agent is connected but not actively working";

    idleView.appendChild(idleStatus);
    idleRow.appendChild(idleItem);
    idleRow.appendChild(idleView);
    idleRow.appendChild(idleDescription);
    connectedContainer.appendChild(idleRow);

    // WORKING State
    const workingRow = document.createElement("div");
    workingRow.className = "status-row";

    const workingItem = document.createElement("div");
    workingItem.className = "status-item";
    workingItem.textContent = "WORKING:";

    const workingView = document.createElement("div");
    workingView.className = "status-view";

    const workingStatus = document.createElement("sketch-call-status") as any;
    workingStatus.isDisconnected = false;
    workingStatus.isIdle = false;
    workingStatus.llmCalls = 1;
    workingStatus.toolCalls = ["bash"];

    const workingDescription = document.createElement("div");
    workingDescription.className = "description";
    workingDescription.textContent = "Agent is connected and actively working";

    workingView.appendChild(workingStatus);
    workingRow.appendChild(workingItem);
    workingRow.appendChild(workingView);
    workingRow.appendChild(workingDescription);
    connectedContainer.appendChild(workingRow);

    // Disconnected States Container
    const disconnectedContainer = document.createElement("div");
    disconnectedContainer.className = "status-container";

    const disconnectedLabel = document.createElement("div");
    disconnectedLabel.className = "label";
    disconnectedLabel.textContent = "Disconnected State:";
    disconnectedContainer.appendChild(disconnectedLabel);

    // DISCONNECTED State
    const disconnectedRow = document.createElement("div");
    disconnectedRow.className = "status-row";

    const disconnectedItem = document.createElement("div");
    disconnectedItem.className = "status-item";
    disconnectedItem.textContent = "DISCONNECTED:";

    const disconnectedView = document.createElement("div");
    disconnectedView.className = "status-view";

    const disconnectedStatus = document.createElement(
      "sketch-call-status",
    ) as any;
    disconnectedStatus.isDisconnected = true;
    disconnectedStatus.isIdle = true;
    disconnectedStatus.llmCalls = 0;
    disconnectedStatus.toolCalls = [];

    const disconnectedDescription = document.createElement("div");
    disconnectedDescription.className = "description";
    disconnectedDescription.textContent = "Connection lost to the agent";

    disconnectedView.appendChild(disconnectedStatus);
    disconnectedRow.appendChild(disconnectedItem);
    disconnectedRow.appendChild(disconnectedView);
    disconnectedRow.appendChild(disconnectedDescription);
    disconnectedContainer.appendChild(disconnectedRow);

    // Assemble the demo
    demoContainer.appendChild(connectedContainer);
    demoContainer.appendChild(disconnectedContainer);
    section.appendChild(demoContainer);
    container.appendChild(section);
  },
};

export default demo;
