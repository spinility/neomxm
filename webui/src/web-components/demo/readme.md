# Sketch Web Components Demo System

This directory contains an automated demo system for Sketch web components that reduces maintenance overhead and provides a consistent development experience.

## Overview

The demo system consists of:

- **TypeScript Demo Modules** (`*.demo.ts`) - Component-specific demo configurations
- **Demo Framework** (`demo-framework/`) - Shared infrastructure for loading and running demos
- **Shared Fixtures** (`demo-fixtures/`) - Common fake data and utilities
- **Demo Runner** (`demo.html`) - Interactive demo browser

## Quick Start

### Running Demos

```bash
# Start the demo server
npm run demo

# Visit the demo runner
open http://localhost:5173/src/web-components/demo/demo.html
```

### Creating a New Demo

1. Create a new demo module file: `your-component.demo.ts`

```typescript
import { DemoModule } from "./demo-framework/types";
import { demoUtils, sampleData } from "./demo-fixtures/index";

const demo: DemoModule = {
  title: "Your Component Demo",
  description: "Interactive demo showing component functionality",
  imports: ["your-component.ts"], // Component files to import

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const section = demoUtils.createDemoSection(
      "Basic Usage",
      "Description of what this demo shows",
    );

    // Create your component
    const component = document.createElement("your-component") as any;
    component.data = sampleData.yourData;

    // Add to container
    section.appendChild(component);
    container.appendChild(section);
  },

  cleanup: async () => {
    // Optional cleanup when demo is unloaded
  },
};

export default demo;
```

2. Add the new demo to the knownComponents list in demo-framework/demo-runner.ts :

```typescript
  async getAvailableComponents(): Promise<string[]> {
    // ...
    const knownComponents = [
      // existing demos
      "your-component",
      // other existing demos...
```

3. Your demo will automatically appear in the demo runner!

## Demo Module Structure

### Required Properties

- `title`: Display name for the demo
- `imports`: Array of component files to import (relative to parent directory)
- `setup`: Function that creates the demo content

### Optional Properties

- `description`: Brief description of what the demo shows
- `styles`: Additional CSS files to load
- `customStyles`: Inline CSS styles
- `cleanup`: Function called when demo is unloaded

### Setup Function

The setup function receives a container element and should populate it with demo content:

```typescript
setup: async (container: HTMLElement) => {
  // Use demo utilities for consistent styling
  const section = demoUtils.createDemoSection("Title", "Description");

  // Create and configure your component
  const component = document.createElement("my-component");
  component.setAttribute("data", JSON.stringify(sampleData));

  // Add interactive controls
  const button = demoUtils.createButton("Reset", () => {
    component.reset();
  });

  // Assemble the demo
  section.appendChild(component);
  section.appendChild(button);
  container.appendChild(section);
};
```

## Shared Fixtures

The `demo-fixtures/` directory contains reusable fake data and utilities:

```typescript
import {
  sampleToolCalls,
  sampleTimelineMessages,
  sampleContainerState,
  demoUtils,
} from "./demo-fixtures/index";
```

### Available Fixtures

- `sampleToolCalls` - Various tool call examples
- `sampleTimelineMessages` - Chat/timeline message data
- `sampleContainerState` - Container status information
- `demoUtils` - Helper functions for creating demo UI elements

### Demo Utilities

- `demoUtils.createDemoSection(title, description)` - Create a styled demo section
- `demoUtils.createButton(text, onClick)` - Create a styled button
- `demoUtils.delay(ms)` - Promise-based delay function

## Benefits of This System

### For Developers

- **TypeScript Support**: Full type checking for demo code and shared data
- **Hot Module Replacement**: Instant updates when demo code changes
- **Shared Data**: Consistent fake data across all demos
- **Reusable Utilities**: Common demo patterns abstracted into utilities

### For Maintenance

- **No Boilerplate**: No need to copy HTML structure between demos
- **Centralized Styling**: Demo appearance controlled in one place
- **Type Safety**: Catch errors early with TypeScript compilation

## Vite Integration

The system is designed to work seamlessly with Vite:

- **Dynamic Imports**: Demo modules are loaded on demand
- **TypeScript Compilation**: `.demo.ts` files are compiled automatically
- **HMR Support**: Changes to demos or fixtures trigger instant reloads
- **Dependency Tracking**: Vite knows when to reload based on imports

## Migration from HTML Demos

To convert an existing HTML demo:

1. Extract the component setup JavaScript into a `setup` function
2. Move shared data to `demo-fixtures/`
3. Replace HTML boilerplate with `demoUtils` calls
4. Convert inline styles to `customStyles` property
5. Test with the demo runner

## File Structure

```
demo/
├── demo-framework/
│   ├── types.ts           # TypeScript interfaces
│   └── demo.ts     # Demo loading and execution
├── demo-fixtures/
│   ├── tool-calls.ts      # Tool call sample data
│   ├── timeline-messages.ts # Message sample data
│   ├── container-status.ts  # Status sample data
│   └── index.ts           # Centralized exports
├── demo.html       # Interactive demo browser
├── *.demo.ts             # Individual demo modules
└── readme.md             # This file
```

## Advanced Usage

### Custom Styling

```typescript
const demo: DemoModule = {
  // ...
  customStyles: `
    .my-demo-container {
      background: #f0f0f0;
      padding: 20px;
      border-radius: 8px;
    }
  `,
  setup: async (container) => {
    container.className = "my-demo-container";
    // ...
  },
};
```

### Progressive Loading

```typescript
setup: async (container) => {
  const messages = [];
  const timeline = document.createElement("sketch-timeline");

  // Add messages progressively
  for (let i = 0; i < sampleMessages.length; i++) {
    await demoUtils.delay(500);
    messages.push(sampleMessages[i]);
    timeline.messages = [...messages];
  }
};
```

### Cleanup

```typescript
let intervalId: number;

const demo: DemoModule = {
  // ...
  setup: async (container) => {
    // Set up interval for updates
    intervalId = setInterval(() => {
      updateComponent();
    }, 1000);
  },

  cleanup: async () => {
    // Clean up interval
    if (intervalId) {
      clearInterval(intervalId);
    }
  },
};
```

For more examples, see the existing demo modules in this directory.
