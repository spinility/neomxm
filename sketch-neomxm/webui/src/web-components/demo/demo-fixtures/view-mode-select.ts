/**
 * Shared demo fixtures for SketchViewModeSelect component
 */

/**
 * Sample view mode configurations for different scenarios
 */
export const sampleViewModeConfigs = {
  // Basic configuration with no diff stats
  basic: {
    activeMode: "chat" as const,
    diffLinesAdded: 0,
    diffLinesRemoved: 0,
  },

  // Configuration with small diff stats
  smallDiff: {
    activeMode: "diff2" as const,
    diffLinesAdded: 5,
    diffLinesRemoved: 2,
  },

  // Configuration with large diff stats
  largeDiff: {
    activeMode: "diff2" as const,
    diffLinesAdded: 247,
    diffLinesRemoved: 156,
  },

  // Configuration with terminal mode active
  terminalActive: {
    activeMode: "terminal" as const,
    diffLinesAdded: 12,
    diffLinesRemoved: 8,
  },

  // Configuration with only additions
  additionsOnly: {
    activeMode: "diff2" as const,
    diffLinesAdded: 35,
    diffLinesRemoved: 0,
  },

  // Configuration with only deletions
  deletionsOnly: {
    activeMode: "diff2" as const,
    diffLinesAdded: 0,
    diffLinesRemoved: 28,
  },
};

/**
 * Sample scenarios for interactive demos
 */
export const viewModeScenarios = [
  {
    name: "Fresh Start",
    description: "No changes, chat mode active",
    config: sampleViewModeConfigs.basic,
  },
  {
    name: "Small Changes",
    description: "Few lines changed, diff view active",
    config: sampleViewModeConfigs.smallDiff,
  },
  {
    name: "Major Refactor",
    description: "Large number of changes across files",
    config: sampleViewModeConfigs.largeDiff,
  },
  {
    name: "Terminal Work",
    description: "Running commands, terminal active",
    config: sampleViewModeConfigs.terminalActive,
  },
  {
    name: "New Feature",
    description: "Only additions, new code written",
    config: sampleViewModeConfigs.additionsOnly,
  },
  {
    name: "Code Cleanup",
    description: "Only deletions, removing unused code",
    config: sampleViewModeConfigs.deletionsOnly,
  },
];

/**
 * Type for view mode configuration
 */
export type ViewModeConfig = {
  activeMode: "chat" | "diff2" | "terminal";
  diffLinesAdded: number;
  diffLinesRemoved: number;
};

/**
 * Helper function to apply configuration to a component
 */
export function applyViewModeConfig(
  component: any,
  config: ViewModeConfig,
): void {
  component.activeMode = config.activeMode;
  component.diffLinesAdded = config.diffLinesAdded;
  component.diffLinesRemoved = config.diffLinesRemoved;
  component.requestUpdate();
}

/**
 * Create a series of buttons for testing different scenarios
 */
export function createViewModeTestButtons(
  component: any,
  container: HTMLElement,
): void {
  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 15px 0;
    padding: 10px;
    background: #f6f8fa;
    border-radius: 6px;
  `;

  viewModeScenarios.forEach((scenario) => {
    const button = document.createElement("button");
    button.textContent = scenario.name;
    button.title = scenario.description;
    button.style.cssText = `
      padding: 6px 12px;
      background: #0969da;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s;
    `;

    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = "#0860ca";
    });

    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "#0969da";
    });

    button.addEventListener("click", () => {
      applyViewModeConfig(component, scenario.config);

      // Visual feedback
      const allButtons = buttonContainer.querySelectorAll("button");
      allButtons.forEach((btn) => {
        (btn as HTMLButtonElement).style.backgroundColor = "#0969da";
      });
      button.style.backgroundColor = "#2da44e";

      setTimeout(() => {
        button.style.backgroundColor = "#0969da";
      }, 1000);
    });

    buttonContainer.appendChild(button);
  });

  container.appendChild(buttonContainer);
}
