import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Mobile Chat Demo",
  description: "Mobile chat interface with message display and scroll behavior",
  imports: ["../mobile-chat.js"],

  customStyles: `
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
    }
  `,

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "Mobile Chat Interface",
      "Demonstrates mobile chat with multiple messages and scroll behavior",
    );

    // Create the mobile chat element
    const chatElement = document.createElement("mobile-chat") as any;
    chatElement.style.height = "60vh";
    chatElement.style.display = "block";
    chatElement.style.border = "1px solid #ccc";
    chatElement.style.borderRadius = "8px";

    // Sample messages to test scroll behavior
    const messages = [
      {
        id: "1",
        type: "user",
        content: "Hello, I need help with setting up a project.",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        type: "agent",
        content:
          "Hello! I'd be happy to help you set up a project. What kind of project are you working on?",
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        type: "user",
        content:
          "I'm trying to build a web application using React and TypeScript.",
        timestamp: new Date().toISOString(),
      },
      {
        id: "4",
        type: "agent",
        content:
          "Great choice! React with TypeScript is a powerful combination. Let me help you get started. First, we'll need to set up the project structure. Here are the steps:\n\n1. Create a new React app with TypeScript template\n2. Install additional dependencies\n3. Set up the folder structure\n4. Configure the development environment\n\nWould you like me to walk you through each step?",
        timestamp: new Date().toISOString(),
      },
      {
        id: "5",
        type: "user",
        content:
          "Yes, please walk me through each step. I want to make sure I understand everything.",
        timestamp: new Date().toISOString(),
      },
      {
        id: "6",
        type: "agent",
        content:
          "Perfect! Let's start with step 1:\n\n**Step 1: Create a new React app with TypeScript template**\n\nOpen your terminal and run:\n```bash\nnpx create-react-app my-app --template typescript\ncd my-app\n```\n\nThis will create a new React application with TypeScript already configured. The `--template typescript` flag tells Create React App to set up TypeScript for you automatically.",
        timestamp: new Date().toISOString(),
      },
      {
        id: "7",
        type: "user",
        content:
          "Okay, I ran that command and it created the project. What's next?",
        timestamp: new Date().toISOString(),
      },
      {
        id: "8",
        type: "agent",
        content:
          "Excellent! Now let's move to step 2:\n\n**Step 2: Install additional dependencies**\n\nYou might want to install some commonly used packages. Here are some recommendations:\n\n```bash\n# For routing\nnpm install react-router-dom\nnpm install @types/react-router-dom\n\n# For styling (choose one)\nnpm install styled-components  # or\nnpm install @mui/material\n\n# For state management (if needed)\nnpm install redux @reduxjs/toolkit react-redux\n```\n\nWhich of these sound useful for your project?",
        timestamp: new Date().toISOString(),
      },
      {
        id: "9",
        type: "user",
        content:
          "I think I'll need routing and probably Material-UI for styling. Should I install both?",
        timestamp: new Date().toISOString(),
      },
      {
        id: "10",
        type: "agent",
        content:
          "Absolutely! React Router and Material-UI work great together. Run these commands:\n\n```bash\nnpm install react-router-dom @types/react-router-dom\nnpm install @mui/material @emotion/react @emotion/styled\nnpm install @mui/icons-material\n```\n\nMaterial-UI (now called MUI) requires @emotion packages for styling, and the icons package gives you access to thousands of Material Design icons.",
        timestamp: new Date().toISOString(),
      },
    ];

    // Set messages after a brief delay to simulate loading
    setTimeout(() => {
      chatElement.messages = messages;
    }, 100);

    section.appendChild(chatElement);
    container.appendChild(section);
  },
};

export default demo;
