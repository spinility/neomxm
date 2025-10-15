import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Mobile App Shell Demo",
  description: "Entry point component that loads the mobile shell",
  imports: ["../mobile-app-shell.ts"],

  customStyles: `
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
    }
    .demo-note {
      background: #e3f2fd;
      border: 1px solid #90caf9;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      color: #1565c0;
    }
    .code-block {
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 12px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      margin: 8px 0;
      overflow-x: auto;
    }
  `,

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "Mobile App Shell Entry Point",
      "This component serves as the entry point for the mobile shell",
    );

    // Add explanation
    const explanation = document.createElement("div");
    explanation.className = "demo-note";
    explanation.innerHTML = `
      <strong>About mobile-app-shell:</strong><br>
      This is a simple entry point component that imports and initializes the mobile-shell component.
      It acts as the main application entry point for mobile devices.
    `;
    section.appendChild(explanation);

    // Show the actual code
    const codeSection = demoUtils.createDemoSection(
      "Component Code",
      "The mobile-app-shell.ts file contents:",
    );

    const codeBlock = document.createElement("div");
    codeBlock.className = "code-block";
    codeBlock.textContent = `// Mobile app shell entry point
import "./mobile-shell";`;
    codeSection.appendChild(codeBlock);

    // Architecture explanation
    const archSection = demoUtils.createDemoSection(
      "Architecture",
      "How the mobile app shell fits into the overall architecture",
    );

    const archList = document.createElement("ul");
    archList.style.cssText = "margin: 0; padding-left: 20px; line-height: 1.8;";
    archList.innerHTML = `
      <li><strong>mobile-app-shell.ts</strong> - Entry point (this component)</li>
      <li><strong>mobile-shell.ts</strong> - Main shell with data management</li>
      <li><strong>mobile-title.ts</strong> - Header with connection status</li>
      <li><strong>mobile-chat.ts</strong> - Message display area</li>
      <li><strong>mobile-chat-input.ts</strong> - Input field and send button</li>
      <li><strong>mobile-diff.ts</strong> - Git diff viewer</li>
    `;
    archSection.appendChild(archList);

    // Usage example
    const usageSection = demoUtils.createDemoSection(
      "Usage",
      "How to use this component in HTML",
    );

    const usageCode = document.createElement("div");
    usageCode.className = "code-block";
    usageCode.innerHTML = `&lt;!-- Simply include the component --&gt;<br>&lt;script type="module" src="mobile-app-shell.js"&gt;&lt;/script&gt;<br><br>&lt;!-- The mobile-shell element will be available --&gt;<br>&lt;mobile-shell&gt;&lt;/mobile-shell&gt;`;
    usageSection.appendChild(usageCode);

    const note = document.createElement("div");
    note.className = "demo-note";
    note.innerHTML = `
      <strong>Note:</strong> To see the full mobile shell in action, check out the 
      <a href="demo.html#mobile-shell" style="color: #1565c0; text-decoration: underline;">Mobile Shell Demo</a> 
      which demonstrates the complete mobile interface.
    `;
    usageSection.appendChild(note);

    container.appendChild(section);
    container.appendChild(codeSection);
    container.appendChild(archSection);
    container.appendChild(usageSection);
  },
};

export default demo;
