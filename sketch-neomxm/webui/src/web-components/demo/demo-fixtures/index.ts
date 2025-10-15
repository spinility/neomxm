/**
 * Centralized exports for all demo fixtures
 */

// Tool calls
export {
  sampleToolCalls,
  longBashCommand,
  multipleToolCallGroups,
} from "./tool-calls";

// Timeline messages
export {
  sampleTimelineMessages,
  longTimelineMessage,
  mixedTimelineMessages,
} from "./timeline-messages";

// Container status
export {
  sampleUsage,
  sampleContainerState,
  lightUsageState,
  heavyUsageState,
} from "./container-status";

// View mode select
export {
  sampleViewModeConfigs,
  viewModeScenarios,
  applyViewModeConfig,
  createViewModeTestButtons,
} from "./view-mode-select";

// Call status
export {
  idleCallStatus,
  workingCallStatus,
  heavyWorkingCallStatus,
  disconnectedCallStatus,
  workingDisconnectedCallStatus,
} from "./call-status";
export type { CallStatusState } from "./call-status";

// Ensure dark mode CSS variables are available
if (
  typeof document !== "undefined" &&
  !document.getElementById("demo-fixtures-dark-mode-styles")
) {
  const style = document.createElement("style");
  style.id = "demo-fixtures-dark-mode-styles";
  style.textContent = `
    :root {
      --demo-fixture-section-border: #e1e5e9;
      --demo-fixture-section-bg: #f8f9fa;
      --demo-fixture-header-color: #24292f;
      --demo-fixture-text-color: #656d76;
      --demo-fixture-button-bg: #0969da;
      --demo-fixture-button-hover-bg: #0860ca;
      --demo-label-color: #24292f;
      --demo-secondary-text: #666;
      --demo-light-bg: #f6f8fa;
      --demo-card-bg: #ffffff;
      --demo-border: #d1d9e0;
      --demo-instruction-bg: #e3f2fd;
      --demo-control-bg: #f0f0f0;
    }
    
    .dark {
      --demo-fixture-section-border: #30363d;
      --demo-fixture-section-bg: #21262d;
      --demo-fixture-header-color: #e6edf3;
      --demo-fixture-text-color: #8b949e;
      --demo-fixture-button-bg: #4493f8;
      --demo-fixture-button-hover-bg: #539bf5;
      --demo-label-color: #e6edf3;
      --demo-secondary-text: #8b949e;
      --demo-light-bg: #21262d;
      --demo-card-bg: #0d1117;
      --demo-border: #30363d;
      --demo-instruction-bg: #1c2128;
      --demo-control-bg: #21262d;
    }
  `;
  document.head.appendChild(style);
}

// Common demo utilities
export const demoStyles = {
  container: `
    max-width: 1200px;
    margin: 20px auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `,

  demoSection: `
    margin: 20px 0;
    padding: 15px;
    border: 1px solid var(--demo-fixture-section-border);
    border-radius: 8px;
    background: var(--demo-fixture-section-bg);
    transition: background-color 0.2s, border-color 0.2s;
  `,

  demoHeader: `
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 10px;
    color: var(--demo-fixture-header-color);
    transition: color 0.2s;
  `,
};

/**
 * Common demo setup utilities
 */
export const demoUtils = {
  /**
   * Create a labeled demo section
   */
  createDemoSection(title: string, description?: string): HTMLElement {
    const section = document.createElement("div");
    section.style.cssText = demoStyles.demoSection;

    const header = document.createElement("h3");
    header.style.cssText = demoStyles.demoHeader;
    header.textContent = title;
    section.appendChild(header);

    if (description) {
      const desc = document.createElement("p");
      desc.textContent = description;
      desc.style.cssText =
        "color: var(--demo-fixture-text-color); margin-bottom: 15px; transition: color 0.2s;";
      section.appendChild(desc);
    }

    return section;
  },

  /**
   * Wait for a specified number of milliseconds
   */
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Create a simple button for demo interactions
   */
  createButton(text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = `
      padding: 8px 16px;
      margin: 5px;
      background: var(--demo-fixture-button-bg);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    `;
    button.addEventListener("mouseenter", () => {
      button.style.background = "var(--demo-fixture-button-hover-bg)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = "var(--demo-fixture-button-bg)";
    });
    button.addEventListener("click", onClick);
    return button;
  },
};
