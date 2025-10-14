import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Mobile Title Demo",
  description:
    "Mobile header with connection status, thinking indicator, and view switching",
  imports: ["../mobile-title.ts"],

  customStyles: `
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
    }
    .mobile-viewport {
      max-width: 375px;
      margin: 0 auto;
      border: 1px solid #ddd;
      border-radius: 12px;
      overflow: hidden;
      background: white;
    }
    .demo-background {
      height: 200px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      font-weight: 500;
    }
    .control-row {
      display: flex;
      gap: 10px;
      margin: 10px 0;
      flex-wrap: wrap;
      align-items: center;
    }
    .control-label {
      font-weight: 500;
      min-width: 100px;
    }
  `,

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "Mobile Title Header",
      "Header component with connection status, thinking animations, and view controls",
    );

    // Create mobile viewport container
    const viewport = document.createElement("div");
    viewport.className = "mobile-viewport";

    // Create the mobile title element
    const titleElement = document.createElement("mobile-title") as any;
    titleElement.connectionStatus = "disconnected";
    titleElement.isThinking = false;
    titleElement.skabandAddr = "https://sketch.dev";
    titleElement.currentView = "chat";
    titleElement.slug = "demo-session";

    // Listen for view changes
    titleElement.addEventListener("view-change", (event: CustomEvent) => {
      console.log("View changed to:", event.detail.view);
      currentViewDisplay.textContent = event.detail.view;
    });

    // Add a background area to show the header in context
    const background = document.createElement("div");
    background.className = "demo-background";
    background.textContent = "App Content Area";

    viewport.appendChild(titleElement);
    viewport.appendChild(background);
    section.appendChild(viewport);

    // Create controls section
    const controlsSection = demoUtils.createDemoSection(
      "Interactive Controls",
      "Test different states and properties of the mobile title",
    );

    // Connection status controls
    const statusRow = document.createElement("div");
    statusRow.className = "control-row";

    const statusLabel = document.createElement("span");
    statusLabel.className = "control-label";
    statusLabel.textContent = "Connection:";

    const disconnectedBtn = demoUtils.createButton("Disconnected", () => {
      titleElement.connectionStatus = "disconnected";
    });
    const connectingBtn = demoUtils.createButton("Connecting", () => {
      titleElement.connectionStatus = "connecting";
    });
    const connectedBtn = demoUtils.createButton("Connected", () => {
      titleElement.connectionStatus = "connected";
    });

    statusRow.appendChild(statusLabel);
    statusRow.appendChild(disconnectedBtn);
    statusRow.appendChild(connectingBtn);
    statusRow.appendChild(connectedBtn);

    // Thinking state controls
    const thinkingRow = document.createElement("div");
    thinkingRow.className = "control-row";

    const thinkingLabel = document.createElement("span");
    thinkingLabel.className = "control-label";
    thinkingLabel.textContent = "Thinking:";

    const thinkingToggle = demoUtils.createButton("Toggle Thinking", () => {
      titleElement.isThinking = !titleElement.isThinking;
      thinkingToggle.textContent = titleElement.isThinking
        ? "Stop Thinking"
        : "Start Thinking";
    });

    thinkingRow.appendChild(thinkingLabel);
    thinkingRow.appendChild(thinkingToggle);

    // View change tracking
    const viewRow = document.createElement("div");
    viewRow.className = "control-row";

    const viewLabel = document.createElement("span");
    viewLabel.className = "control-label";
    viewLabel.textContent = "Current View:";

    const currentViewDisplay = document.createElement("span");
    currentViewDisplay.textContent = titleElement.currentView;
    currentViewDisplay.style.cssText =
      "padding: 4px 8px; background: #f0f0f0; border-radius: 4px; font-family: monospace;";

    viewRow.appendChild(viewLabel);
    viewRow.appendChild(currentViewDisplay);

    // Skaband address toggle
    const addrRow = document.createElement("div");
    addrRow.className = "control-row";

    const addrLabel = document.createElement("span");
    addrLabel.className = "control-label";
    addrLabel.textContent = "Skaband Link:";

    const toggleAddrBtn = demoUtils.createButton("Toggle Link", () => {
      titleElement.skabandAddr = titleElement.skabandAddr
        ? ""
        : "https://sketch.dev";
      toggleAddrBtn.textContent = titleElement.skabandAddr
        ? "Remove Link"
        : "Add Link";
    });

    addrRow.appendChild(addrLabel);
    addrRow.appendChild(toggleAddrBtn);

    // Slug controls
    const slugRow = document.createElement("div");
    slugRow.className = "control-row";

    const slugLabel = document.createElement("span");
    slugLabel.className = "control-label";
    slugLabel.textContent = "Session Slug:";

    const slugInput = document.createElement("input");
    slugInput.type = "text";
    slugInput.value = titleElement.slug;
    slugInput.style.cssText =
      "padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;";
    slugInput.addEventListener("input", () => {
      titleElement.slug = slugInput.value;
    });

    slugRow.appendChild(slugLabel);
    slugRow.appendChild(slugInput);

    controlsSection.appendChild(statusRow);
    controlsSection.appendChild(thinkingRow);
    controlsSection.appendChild(viewRow);
    controlsSection.appendChild(addrRow);
    controlsSection.appendChild(slugRow);

    // Features section
    const featuresSection = demoUtils.createDemoSection(
      "Features",
      "Key features and behaviors of the mobile title component",
    );

    const featuresList = document.createElement("ul");
    featuresList.style.cssText =
      "margin: 0; padding-left: 20px; line-height: 1.8;";
    featuresList.innerHTML = `
      <li><strong>Connection status indicator:</strong> Color-coded dot showing connected/connecting/disconnected states</li>
      <li><strong>Animated thinking indicator:</strong> Three-dot animation when AI is processing</li>
      <li><strong>View switcher:</strong> Dropdown to toggle between Chat and Diff views</li>
      <li><strong>Skaband integration:</strong> Clickable link to skaband instance with favicon</li>
      <li><strong>Session slug display:</strong> Shows current session identifier</li>
      <li><strong>Responsive design:</strong> Optimized for mobile screen sizes</li>
      <li><strong>CSS animations:</strong> Smooth pulse and thinking dot animations</li>
    `;
    featuresSection.appendChild(featuresList);

    // Animation details section
    const animSection = demoUtils.createDemoSection(
      "Animations",
      "CSS animation details implemented in the component",
    );

    const animList = document.createElement("ul");
    animList.style.cssText = "margin: 0; padding-left: 20px; line-height: 1.8;";
    animList.innerHTML = `
      <li><strong>Pulse animation:</strong> Connecting status shows pulsing yellow dot</li>
      <li><strong>Thinking animation:</strong> Three dots with staggered scaling animation</li>
      <li><strong>Animation timing:</strong> Carefully tuned delays and durations for smooth effects</li>
      <li><strong>Performance:</strong> Uses transform and opacity for GPU-accelerated animations</li>
      <li><strong>Auto-injection:</strong> Animation styles are injected into document head on connect</li>
    `;
    animSection.appendChild(animList);

    container.appendChild(section);
    container.appendChild(controlsSection);
    container.appendChild(featuresSection);
    container.appendChild(animSection);
  },
};

export default demo;
