/**
 * Demo module for sketch-app-shell component
 */

import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Sketch App Shell Demo",
  description:
    "Full sketch application shell with chat, diff, and terminal views",
  imports: ["../sketch-app-shell"],
  styles: ["/src/sketch-app-shell.css"],

  setup: async (container: HTMLElement) => {
    // Mock the service worker for data services
    const { worker } = await import("./mocks/browser");
    await worker.start();

    // Create demo sections
    const mainSection = demoUtils.createDemoSection(
      "Sketch App Shell",
      "Interactive sketch application shell with multiple view modes",
    );

    // Create the app shell
    const appShell = document.createElement("sketch-app-shell") as any;

    // Set up the shell to be contained within the demo
    appShell.style.cssText = `
      border: 1px solid #d1d9e0;
      overflow: hidden;
      display: block;
    `;

    // Assemble the demo
    mainSection.appendChild(appShell);

    container.appendChild(mainSection);

    // Wait a bit for the component to initialize
    await demoUtils.delay(100);
  },

  cleanup: async () => {
    // Clean up any global state if needed
    console.log("Cleaning up sketch-app-shell demo");
  },
};

export default demo;
