/**
 * Demo module for sketch-todo-panel component
 */

import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

// Sample todo data
const sampleTodoList = {
  items: [
    {
      id: "task-1",
      status: "completed" as const,
      task: "Convert sketch-todo-panel.ts to inherit from SketchTailwindElement",
    },
    {
      id: "task-2",
      status: "in-progress" as const,
      task: "Test the converted element to ensure it works correctly",
    },
    {
      id: "task-3",
      status: "queued" as const,
      task: "Add unit tests for the todo panel component",
    },
    {
      id: "task-4",
      status: "queued" as const,
      task: "Update documentation with new implementation details",
    },
  ],
};

const largeTodoList = {
  items: [
    {
      id: "task-1",
      status: "completed" as const,
      task: "Implement authentication system with JWT tokens",
    },
    {
      id: "task-2",
      status: "completed" as const,
      task: "Set up database migrations and schema",
    },
    {
      id: "task-3",
      status: "in-progress" as const,
      task: "Build responsive dashboard with real-time updates and complex data visualization components",
    },
    {
      id: "task-4",
      status: "queued" as const,
      task: "Add file upload functionality with drag and drop support",
    },
    {
      id: "task-5",
      status: "queued" as const,
      task: "Implement comprehensive test suite including unit, integration, and end-to-end tests",
    },
    {
      id: "task-6",
      status: "queued" as const,
      task: "Deploy to production environment with monitoring and logging",
    },
    {
      id: "task-7",
      status: "queued" as const,
      task: "Create user documentation and API guides",
    },
  ],
};

const demo: DemoModule = {
  title: "Todo Panel Demo",
  description:
    "Interactive todo list panel showing task progress and allowing comments",
  imports: ["../sketch-todo-panel"],
  styles: ["/dist/tailwind.css"],

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const basicSection = demoUtils.createDemoSection(
      "Basic Todo Panel",
      "Shows a typical todo list with different task statuses",
    );

    const statesSection = demoUtils.createDemoSection(
      "Different States",
      "Loading, error, and empty states",
    );

    const largeListSection = demoUtils.createDemoSection(
      "Large Todo List",
      "Scrollable list with longer task descriptions",
    );

    // Basic todo panel with sample data
    const basicPanel = document.createElement("sketch-todo-panel") as any;
    basicPanel.id = "basic-panel";
    basicPanel.visible = true;
    basicPanel.style.cssText =
      "height: 300px; border: 1px solid #e0e0e0; display: block;";

    // Set the data after a short delay to show it populating
    setTimeout(() => {
      basicPanel.updateTodoContent(JSON.stringify(sampleTodoList));
    }, 100);

    // Loading state panel
    const loadingPanel = document.createElement("sketch-todo-panel") as any;
    loadingPanel.id = "loading-panel";
    loadingPanel.visible = true;
    loadingPanel.loading = true;
    loadingPanel.style.cssText =
      "height: 150px; border: 1px solid #e0e0e0; display: block; margin-right: 10px; flex: 1;";

    // Error state panel
    const errorPanel = document.createElement("sketch-todo-panel") as any;
    errorPanel.id = "error-panel";
    errorPanel.visible = true;
    errorPanel.error = "Failed to load todo data";
    errorPanel.style.cssText =
      "height: 150px; border: 1px solid #e0e0e0; display: block; margin-right: 10px; flex: 1;";

    // Empty state panel
    const emptyPanel = document.createElement("sketch-todo-panel") as any;
    emptyPanel.id = "empty-panel";
    emptyPanel.visible = true;
    emptyPanel.updateTodoContent("");
    emptyPanel.style.cssText =
      "height: 150px; border: 1px solid #e0e0e0; display: block; flex: 1;";

    // Large list panel
    const largePanel = document.createElement("sketch-todo-panel") as any;
    largePanel.id = "large-panel";
    largePanel.visible = true;
    largePanel.style.cssText =
      "height: 400px; border: 1px solid #e0e0e0; display: block;";
    largePanel.updateTodoContent(JSON.stringify(largeTodoList));

    // Create states container
    const statesContainer = document.createElement("div");
    statesContainer.style.cssText = "display: flex; gap: 10px; margin: 10px 0;";
    statesContainer.appendChild(loadingPanel);
    statesContainer.appendChild(errorPanel);
    statesContainer.appendChild(emptyPanel);

    // Add state labels
    const loadingLabel = document.createElement("div");
    loadingLabel.textContent = "Loading State";
    loadingLabel.style.cssText =
      "font-weight: bold; margin-bottom: 8px; flex: 1; text-align: center;";

    const errorLabel = document.createElement("div");
    errorLabel.textContent = "Error State";
    errorLabel.style.cssText =
      "font-weight: bold; margin-bottom: 8px; flex: 1; text-align: center;";

    const emptyLabel = document.createElement("div");
    emptyLabel.textContent = "Empty State";
    emptyLabel.style.cssText =
      "font-weight: bold; margin-bottom: 8px; flex: 1; text-align: center;";

    const labelsContainer = document.createElement("div");
    labelsContainer.style.cssText =
      "display: flex; gap: 10px; margin-bottom: 5px;";
    labelsContainer.appendChild(loadingLabel);
    labelsContainer.appendChild(errorLabel);
    labelsContainer.appendChild(emptyLabel);

    // Add event listener for comment events
    const eventLog = document.createElement("div");
    eventLog.style.cssText =
      "margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 12px;";
    eventLog.innerHTML =
      "<strong>Event Log:</strong> (try clicking the 💬 button on in-progress or queued items)<br>";

    const logEvent = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      eventLog.innerHTML += `<div>[${timestamp}] ${message}</div>`;
      eventLog.scrollTop = eventLog.scrollHeight;
    };

    // Listen for todo comment events
    [basicPanel, largePanel].forEach((panel) => {
      panel.addEventListener("todo-comment", (event: any) => {
        logEvent(
          `Todo comment received: "${event.detail.comment.substring(0, 50)}..."`,
        );
      });
    });

    // Assemble the demo
    basicSection.appendChild(basicPanel);

    statesSection.appendChild(labelsContainer);
    statesSection.appendChild(statesContainer);

    largeListSection.appendChild(largePanel);

    container.appendChild(basicSection);
    container.appendChild(statesSection);
    container.appendChild(largeListSection);
    container.appendChild(eventLog);
  },

  cleanup: () => {
    // Remove any event listeners if needed
    const panels = document.querySelectorAll("sketch-todo-panel");
    panels.forEach((panel) => {
      (panel as any).removeEventListener("todo-comment", () => {});
    });
  },
};

export default demo;
