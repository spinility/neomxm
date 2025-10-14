import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Mobile Diff Demo",
  description:
    "Mobile-optimized git diff viewer with file navigation and Monaco editor integration",
  imports: ["../mobile-diff.ts"],

  customStyles: `
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
    }
    .mobile-viewport {
      max-width: 375px;
      height: 500px;
      margin: 0 auto;
      border: 1px solid #ddd;
      border-radius: 12px;
      overflow: hidden;
      background: white;
      display: flex;
      flex-direction: column;
    }
    .demo-note {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 12px;
      margin: 16px 0;
      color: #856404;
      font-size: 14px;
    }
    .status-display {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 12px;
      margin: 10px 0;
      font-family: monospace;
      font-size: 13px;
    }
  `,

  setup: async (container: HTMLElement) => {
    // Mark container for cleanup
    container.setAttribute("data-demo", "mobile-diff");

    const section = demoUtils.createDemoSection(
      "Mobile Diff Viewer",
      "Git diff viewer optimized for mobile devices with touch-friendly controls",
    );

    // Create mobile viewport container
    const viewport = document.createElement("div");
    viewport.className = "mobile-viewport";

    // Create the mobile diff element
    const diffElement = document.createElement("mobile-diff") as any;
    diffElement.style.height = "100%";
    diffElement.style.width = "100%";

    viewport.appendChild(diffElement);
    section.appendChild(viewport);

    // Add demo note about functionality
    const note = document.createElement("div");
    note.className = "demo-note";
    note.innerHTML = `
      <strong>Note:</strong> This demo shows the mobile diff interface. In a real environment, 
      it would load git diff data from the server. The component handles loading states, 
      error states, and responsive diff display.
    `;
    section.appendChild(note);

    // Create controls section
    const controlsSection = demoUtils.createDemoSection(
      "Component Status",
      "Monitor the internal state and loading behavior",
    );

    const statusDisplay = document.createElement("div");
    statusDisplay.className = "status-display";

    // Function to update status display
    const updateStatus = () => {
      const isLoading = diffElement.loading;
      const error = diffElement.error;
      const filesCount = diffElement.files ? diffElement.files.length : 0;

      statusDisplay.innerHTML = `
        Loading: ${isLoading ? "true" : "false"}<br>
        Error: ${error || "none"}<br>
        Files: ${filesCount}<br>
        Connection: ${diffElement.gitService ? "initialized" : "not initialized"}
      `;
    };

    // Update status periodically
    const statusInterval = setInterval(updateStatus, 1000);
    updateStatus();

    controlsSection.appendChild(statusDisplay);

    // Features section
    const featuresSection = demoUtils.createDemoSection(
      "Features",
      "Key capabilities of the mobile diff viewer",
    );

    const featuresList = document.createElement("ul");
    featuresList.style.cssText =
      "margin: 0; padding-left: 20px; line-height: 1.8;";
    featuresList.innerHTML = `
      <li><strong>Touch scrolling:</strong> Smooth touch-based scrolling with -webkit-overflow-scrolling</li>
      <li><strong>File status badges:</strong> Color-coded indicators for Added/Modified/Deleted/Renamed files</li>
      <li><strong>Monaco integration:</strong> Uses sketch-monaco-view for syntax highlighting</li>
      <li><strong>Expand/collapse:</strong> Toggle between showing all lines vs. only changed regions</li>
      <li><strong>Loading states:</strong> Proper loading and error state handling</li>
      <li><strong>Git integration:</strong> Works with GitDataService for live diff data</li>
      <li><strong>Mobile optimized:</strong> Responsive layout that works on small screens</li>
      <li><strong>Change statistics:</strong> Shows addition/deletion counts per file</li>
    `;
    featuresSection.appendChild(featuresList);

    // Implementation details
    const implSection = demoUtils.createDemoSection(
      "Implementation Details",
      "Technical aspects of the mobile diff component",
    );

    const implList = document.createElement("ul");
    implList.style.cssText = "margin: 0; padding-left: 20px; line-height: 1.8;";
    implList.innerHTML = `
      <li><strong>GitDataService:</strong> Interfaces with git backend for diff data</li>
      <li><strong>Async loading:</strong> Loads base commit ref and file contents asynchronously</li>
      <li><strong>File content mapping:</strong> Manages original vs. modified content for each file</li>
      <li><strong>Expand state tracking:</strong> Per-file expansion state management</li>
      <li><strong>Error handling:</strong> Graceful handling of git service errors</li>
      <li><strong>Mobile viewport:</strong> Uses proper flex layout for mobile constraints</li>
      <li><strong>Sticky headers:</strong> File headers remain visible during scroll</li>
    `;
    implSection.appendChild(implList);

    container.appendChild(section);
    container.appendChild(controlsSection);
    container.appendChild(featuresSection);
    container.appendChild(implSection);

    // Store interval for cleanup in component cleanup method
    (container as any)._statusInterval = statusInterval;
  },
  cleanup: async () => {
    // Clean up status interval if it exists
    const containers = document.querySelectorAll('[data-demo="mobile-diff"]');
    containers.forEach((container: any) => {
      if (container._statusInterval) {
        clearInterval(container._statusInterval);
        container._statusInterval = null;
      }
    });
  },
};

export default demo;
