import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Sketch Monaco Viewer Demo",
  description:
    "Monaco editor with code comparison functionality for different languages",
  imports: ["../sketch-monaco-view.ts"],

  customStyles: `
    button {
      padding: 8px 12px;
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 8px;
    }

    button:hover {
      background-color: #3367d6;
    }

    sketch-monaco-view {
      margin-top: 20px;
      height: 500px;
    }
  `,

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "Monaco Code Viewer",
      "Demonstrates the Monaco editor component with side-by-side code comparison for different programming languages.",
    );

    // Create control panel
    const controlPanel = document.createElement("div");
    controlPanel.style.marginBottom = "2rem";
    controlPanel.style.padding = "1rem";
    controlPanel.style.backgroundColor = "var(--demo-control-bg);";
    controlPanel.style.borderRadius = "4px";

    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.marginTop = "1rem";

    // Create example buttons
    const jsButton = demoUtils.createButton("Example 1: JavaScript", () => {
      diffEditor.setOriginalCode(
        `function calculateTotal(items) {
  return items
    .map(item => item.price * item.quantity)
    .reduce((a, b) => a + b, 0);
}`,
        "original.js",
      );

      diffEditor.setModifiedCode(
        `function calculateTotal(items) {
  // Apply discount if available
  return items
    .map(item => {
      const price = item.discount ?
        item.price * (1 - item.discount) :
        item.price;
      return price * item.quantity;
    })
    .reduce((a, b) => a + b, 0);
}`,
        "modified.js",
      );
    });

    const htmlButton = demoUtils.createButton("Example 2: HTML", () => {
      diffEditor.setOriginalCode(
        `<!DOCTYPE html>
<html>
<head>
  <title>Demo Page</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>This is a paragraph.</p>
</body>
</html>`,
        "original.html",
      );

      diffEditor.setModifiedCode(
        `<!DOCTYPE html>
<html>
<head>
  <title>Demo Page</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Hello World</h1>
  </header>
  <main>
    <p>This is a paragraph with some <strong>bold</strong> text.</p>
  </main>
  <footer>
    <p>&copy; 2025</p>
  </footer>
</body>
</html>`,
        "modified.html",
      );
    });

    const goButton = demoUtils.createButton("Example 3: Go", () => {
      diffEditor.setOriginalCode(
        `package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}`,
        "original.go",
      );

      diffEditor.setModifiedCode(
        `package main

import (
	"fmt"
	"time"
)

func main() {
	fmt.Println("Hello, world!")
	fmt.Printf("The time is %s\n", time.Now().Format(time.RFC3339))
}`,
        "modified.go",
      );
    });

    buttonsContainer.appendChild(jsButton);
    buttonsContainer.appendChild(htmlButton);
    buttonsContainer.appendChild(goButton);

    controlPanel.innerHTML = `<p>Select an example to see code comparison in different languages:</p>`;
    controlPanel.appendChild(buttonsContainer);

    // Create the Monaco view component
    const diffEditor = document.createElement("sketch-monaco-view") as any;
    diffEditor.id = "diffEditor";

    // Set initial example
    diffEditor.originalCode = `function hello() {
  console.log("Hello World");
  return true;
}`;

    diffEditor.modifiedCode = `function hello() {
  // Add a comment
  console.log("Hello Updated World");
  return true;
}`;

    section.appendChild(controlPanel);
    section.appendChild(diffEditor);
    container.appendChild(section);
  },
};

export default demo;
