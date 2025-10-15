/**
 * Shared fake timeline message data for demos
 */

import { AgentMessage } from "../../../types";
import { sampleToolCalls } from "./tool-calls";

const baseTimestamp = new Date("2024-01-15T10:00:00Z");

export const sampleTimelineMessages: AgentMessage[] = [
  {
    type: "user",
    end_of_turn: true,
    content:
      "Can you help me implement a file upload component with drag and drop support?",
    timestamp: new Date(baseTimestamp.getTime()).toISOString(),
    conversation_id: "demo-conversation",
    idx: 0,
  },
  {
    type: "agent",
    end_of_turn: false,
    content:
      "I'll help you create a file upload component with drag and drop support. Let me start by analyzing your current project structure and then implement the component.",
    timestamp: new Date(baseTimestamp.getTime() + 1000).toISOString(),
    conversation_id: "demo-conversation",
    idx: 1,
  },
  {
    type: "agent",
    end_of_turn: false,
    content: "First, let me check your current directory structure:",
    tool_calls: [sampleToolCalls[2]], // bash command
    timestamp: new Date(baseTimestamp.getTime() + 2000).toISOString(),
    conversation_id: "demo-conversation",
    idx: 2,
  },
  {
    type: "tool",
    end_of_turn: false,
    content:
      "src/\n├── components/\n│   ├── Button.tsx\n│   └── Input.tsx\n├── styles/\n│   └── globals.css\n└── utils/\n    └── helpers.ts",
    tool_name: "bash",
    tool_call_id: "toolu_01bash123",
    timestamp: new Date(baseTimestamp.getTime() + 3000).toISOString(),
    conversation_id: "demo-conversation",
    idx: 3,
  },
  {
    type: "agent",
    end_of_turn: true,
    content:
      "Perfect! I can see you have a components directory. Now I'll create a FileUpload component with drag and drop functionality. This will include:\n\n1. A drop zone area\n2. File selection via click\n3. Progress indicators\n4. File validation\n5. Preview of selected files",
    timestamp: new Date(baseTimestamp.getTime() + 4000).toISOString(),
    conversation_id: "demo-conversation",
    idx: 4,
  },
];

export const longTimelineMessage: AgentMessage = {
  type: "agent",
  end_of_turn: true,
  content: `I've analyzed your codebase and here's a comprehensive plan for implementing the file upload component:

## Implementation Plan

### 1. Component Structure
The FileUpload component will be built using React with TypeScript. It will consist of:
- A main container with drop zone styling
- File input element (hidden)
- Visual feedback for drag states
- File list display area
- Progress indicators

### 2. Key Features
- **Drag & Drop**: Full drag and drop support with visual feedback
- **Multiple Files**: Support for selecting multiple files at once
- **File Validation**: Size limits, file type restrictions
- **Progress Tracking**: Upload progress for each file
- **Error Handling**: User-friendly error messages
- **Accessibility**: Proper ARIA labels and keyboard navigation

### 3. Technical Considerations
- Use the HTML5 File API for file handling
- Implement proper event handlers for drag events
- Add debouncing for performance
- Include comprehensive error boundaries
- Ensure mobile responsiveness

### 4. Styling Approach
- CSS modules for component-scoped styles
- Responsive design with mobile-first approach
- Smooth animations and transitions
- Consistent with your existing design system

This implementation will provide a robust, user-friendly file upload experience that integrates seamlessly with your existing application.`,
  timestamp: new Date(baseTimestamp.getTime() + 5000).toISOString(),
  conversation_id: "demo-conversation",
  idx: 5,
};

export const mixedTimelineMessages: AgentMessage[] = [
  ...sampleTimelineMessages,
  longTimelineMessage,
  {
    type: "user",
    end_of_turn: true,
    content: "That sounds great! Can you also add file type validation?",
    timestamp: new Date(baseTimestamp.getTime() + 6000).toISOString(),
    conversation_id: "demo-conversation",
    idx: 6,
  },
];
