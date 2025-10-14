import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Sketch Monaco Diff View Demo",
  description:
    "Monaco-based diff view with range and file pickers using mock data",
  imports: ["../sketch-diff2-view.ts"],

  customStyles: `
    .demo-container {
      display: flex;
      height: 80vh;
      min-height: 600px;
      border: 1px solid #ddd;
      margin-top: 20px;
      margin-bottom: 30px;
    }

    sketch-diff2-view {
      width: 100%;
      height: 100%;
    }
  `,

  setup: async (container: HTMLElement) => {
    // Import the mock service
    const { MockGitDataService } = await import("./mock-git-data-service");

    const section = demoUtils.createDemoSection(
      "Monaco Diff View",
      "Demonstrates the Monaco-based diff view with range and file pickers using mock data to simulate real API responses.",
    );

    // Create control panel
    const controlPanel = document.createElement("div");
    controlPanel.className = "control-panel";
    controlPanel.style.marginBottom = "1rem";
    controlPanel.style.padding = "1rem";
    controlPanel.style.backgroundColor = "var(--demo-control-bg);";
    controlPanel.style.borderRadius = "4px";
    controlPanel.innerHTML = `
      <p><strong>Features:</strong></p>
      <ul>
        <li>Monaco editor integration for syntax highlighting</li>
        <li>Side-by-side diff view</li>
        <li>Git range and file picker functionality</li>
        <li>Mock data service for demonstration</li>
      </ul>
    `;

    // Create demo container
    const demoContainer = document.createElement("div");
    demoContainer.className = "demo-container";

    // Create the diff2 view component
    const diff2View = document.createElement("sketch-diff2-view");

    // Create and set up mock service
    const mockService = new MockGitDataService();
    console.log("Demo initialized with MockGitDataService");

    // Set the git service property
    diff2View.gitService = mockService;

    demoContainer.appendChild(diff2View);
    section.appendChild(controlPanel);
    section.appendChild(demoContainer);
    container.appendChild(section);
  },
};

export default demo;
