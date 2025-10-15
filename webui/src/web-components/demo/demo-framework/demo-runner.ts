/**
 * Demo runner that dynamically loads and executes demo modules
 */

import { DemoModule, DemoRunnerOptions, DemoNavigationEvent } from "./types";

export class DemoRunner {
  private container: HTMLElement;
  private basePath: string;
  private currentDemo: DemoModule | null = null;
  private currentComponentName: string | null = null;
  private onDemoChange?: (componentName: string, demo: DemoModule) => void;

  constructor(options: DemoRunnerOptions) {
    this.container = options.container;
    this.basePath = options.basePath || "../";
    this.onDemoChange = options.onDemoChange;
  }

  /**
   * Load and display a demo for the specified component
   */
  async loadDemo(componentName: string): Promise<void> {
    try {
      // Cleanup current demo if any
      await this.cleanup();

      // Dynamically import the demo module
      const demoModule = await import(
        /* @vite-ignore */ `../${componentName}.demo.ts`
      );
      const demo: DemoModule = demoModule.default;

      if (!demo) {
        throw new Error(
          `Demo module for ${componentName} does not export a default DemoModule`,
        );
      }

      // Clear container
      this.container.innerHTML = "";

      // Load additional styles if specified
      if (demo.styles) {
        for (const styleUrl of demo.styles) {
          await this.loadStylesheet(styleUrl);
        }
      }

      // Add custom styles if specified
      if (demo.customStyles) {
        this.addCustomStyles(demo.customStyles, componentName);
      }

      // Import required component modules
      if (demo.imports) {
        for (const importPath of demo.imports) {
          await import(/* @vite-ignore */ this.basePath + importPath);
        }
      }

      // Set up the demo
      await demo.setup(this.container);

      // Update current state
      this.currentDemo = demo;
      this.currentComponentName = componentName;

      // Notify listeners
      if (this.onDemoChange) {
        this.onDemoChange(componentName, demo);
      }

      // Dispatch navigation event
      const event: DemoNavigationEvent = new CustomEvent("demo-navigation", {
        detail: { componentName, demo },
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error(`Failed to load demo for ${componentName}:`, error);
      this.showError(`Failed to load demo for ${componentName}`, error);
    }
  }

  /**
   * Get list of available demo components by scanning for .demo.ts files
   */
  async getAvailableComponents(): Promise<string[]> {
    // For now, we'll maintain a registry of known demo components
    // This could be improved with build-time generation
    const knownComponents = [
      "sketch-app-shell",
      "sketch-call-status",
      "sketch-chat-input",
      "sketch-commits",
      "sketch-container-status",
      "sketch-diff-range-picker",
      "sketch-timeline",
      "sketch-timeline-message",
      "sketch-external-message",
      "sketch-todo-panel",
      "sketch-tool-calls",
      "sketch-view-mode-select",
      "sketch-theme-toggle",
      "mobile-app-shell",
      "mobile-chat",
      "mobile-chat-input",
      "mobile-diff",
      "mobile-shell",
      "mobile-title",
      "sketch-diff2-view",
      "sketch-monaco-view",
      "sketch-timeline-viewport",
      "sketch-tool-card",
      "status-indicators",
      "sketch-workflow-status-summary",
    ];
    knownComponents.sort();

    // Filter to only components that actually have demo files
    const availableComponents: string[] = [];
    for (const component of knownComponents) {
      try {
        // Test if the demo module exists by attempting to import it
        const demoModule = await import(
          /* @vite-ignore */ `../${component}.demo.ts`
        );
        if (demoModule.default) {
          availableComponents.push(component);
        }
      } catch (error) {
        console.warn(`Demo not available for ${component}:`, error);
        // Component demo doesn't exist, skip it
      }
    }

    return availableComponents;
  }

  /**
   * Cleanup current demo
   */
  private async cleanup(): Promise<void> {
    if (this.currentDemo?.cleanup) {
      await this.currentDemo.cleanup();
    }

    // Remove custom styles
    if (this.currentComponentName) {
      this.removeCustomStyles(this.currentComponentName);
    }

    this.currentDemo = null;
    this.currentComponentName = null;
  }

  /**
   * Load a CSS stylesheet dynamically
   */
  private async loadStylesheet(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () =>
        reject(new Error(`Failed to load stylesheet: ${url}`));
      document.head.appendChild(link);
    });
  }

  /**
   * Add custom CSS styles for a demo
   */
  private addCustomStyles(css: string, componentName: string): void {
    const styleId = `demo-custom-styles-${componentName}`;

    // Remove existing styles for this component
    const existing = document.getElementById(styleId);
    if (existing) {
      existing.remove();
    }

    // Add new styles
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Remove custom styles for a component
   */
  private removeCustomStyles(componentName: string): void {
    const styleId = `demo-custom-styles-${componentName}`;
    const existing = document.getElementById(styleId);
    if (existing) {
      existing.remove();
    }
  }

  /**
   * Show error message in the demo container
   */
  private showError(message: string, error: any): void {
    this.container.innerHTML = `
      <div class="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200 font-mono">
        <h3 class="text-lg font-semibold mb-2">Demo Error</h3>
        <p class="mb-4"><strong>${message}</strong></p>
        <details class="text-sm">
          <summary class="cursor-pointer hover:text-red-600 dark:hover:text-red-300">Error Details</summary>
          <pre class="mt-2 p-2 bg-red-100 dark:bg-red-800/30 rounded text-xs overflow-auto">${error.stack || error.message || error}</pre>
        </details>
      </div>
    `;
  }

  /**
   * Get current demo info
   */
  getCurrentDemo(): { componentName: string; demo: DemoModule } | null {
    if (this.currentComponentName && this.currentDemo) {
      return {
        componentName: this.currentComponentName,
        demo: this.currentDemo,
      };
    }
    return null;
  }
}
