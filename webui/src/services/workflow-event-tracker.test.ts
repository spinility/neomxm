import { expect, test } from "@sand4rt/experimental-ct-web";
import {
  WorkflowEventTracker,
  WorkflowEvent,
} from "./workflow-event-tracker.js";
import { AgentMessage } from "../types.js";

// Create minimal mock object with required fields
function createMockWorkflowRunEvent(overrides: any = {}): any {
  const mockEvent = {
    action: "completed",
    workflow_run: {
      id: 12345,
      status: "completed",
      conclusion: "success",
      html_url: "https://github.com/owner/repo/actions/runs/12345",
      head_branch: "main",
      head_sha: "abcd1234567890abcd1234567890abcd12345678",
      ...overrides.workflow_run,
    },
    workflow: {
      id: 123,
      name: "CI",
      ...overrides.workflow,
    },
    repository: {
      id: 456,
      name: "test-repo",
      full_name: "owner/test-repo",
      ...overrides.repository,
    },
    ...overrides,
  };
  return mockEvent;
}

// Mock agent message with workflow event
function createMockWorkflowMessage(
  overrides: Partial<AgentMessage> = {},
  workflowOverrides: any = {},
): AgentMessage {
  return {
    type: "external",
    content: "",
    timestamp: "2024-01-01T12:00:00Z",
    conversation_id: "test-conv",
    end_of_turn: false,
    idx: 0,
    external_message: {
      message_type: "github_workflow_run",
      body: createMockWorkflowRunEvent(workflowOverrides),
      text_content: "Workflow run completed",
    },
    ...overrides,
  };
}

// Mock commit message
function createMockCommitMessage(
  commitHash: string,
  messageIndex: number,
): AgentMessage {
  return {
    type: "commit",
    content: "Commit made",
    timestamp: "2024-01-01T11:30:00Z",
    conversation_id: "test-conv",
    end_of_turn: false,
    idx: messageIndex,
    commits: [
      {
        hash: commitHash,
        subject: "Test commit",
        body: "Test commit body",
      },
    ],
  };
}

test("processMessages groups workflow events by branch and commit", () => {
  const tracker = new WorkflowEventTracker();
  const messages: AgentMessage[] = [
    createMockWorkflowMessage({ idx: 0, timestamp: "2024-01-01T12:00:00Z" }),
    createMockWorkflowMessage(
      {
        idx: 1,
        timestamp: "2024-01-01T12:05:00Z",
      },
      {
        workflow: { name: "Tests" },
      },
    ),
  ];

  tracker.processMessages(messages);

  const groups = tracker.getEventGroups();
  expect(groups.size).toBe(1);

  const group = groups.get("main:abcd1234567890abcd1234567890abcd12345678");
  expect(group).toBeDefined();
  expect(group!.commitSha).toBe("abcd1234567890abcd1234567890abcd12345678");
  expect(group!.commitShort).toBe("abcd123");
  expect(group!.branch).toBe("main");
  expect(group!.events.length).toBe(2);
  expect(group!.firstEventIndex).toBe(0);
  expect(group!.lastUpdated).toBe("2024-01-01T12:05:00Z");
});

test("commit messages linked to workflowGroups", () => {
  const tracker = new WorkflowEventTracker();
  const commitHash = "abcd1234567890abcd1234567890abcd12345678";
  const messages: AgentMessage[] = [
    createMockCommitMessage(commitHash, 0),
    createMockWorkflowMessage({ idx: 1 }),
  ];

  tracker.processMessages(messages);

  const groups = tracker.getEventGroups();
  const group = groups.get(`main:${commitHash}`);
  expect(group!.commitMessageIndex).toBe(0);
});

test("handles multiple branches and commits", () => {
  const tracker = new WorkflowEventTracker();
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      { idx: 0 },
      {
        workflow_run: {
          head_branch: "main",
          head_sha: "commit1",
        },
      },
    ),
    createMockWorkflowMessage(
      { idx: 1 },
      {
        workflow_run: {
          head_branch: "feature",
          head_sha: "commit2",
        },
      },
    ),
  ];

  tracker.processMessages(messages);

  const groups = tracker.getEventGroups();
  expect(groups.size).toBe(2);
  expect(groups.has("main:commit1")).toBe(true);
  expect(groups.has("feature:commit2")).toBe(true);
});

// Test getSummaryPlacement prefers commit message index
test("getSummaryPlacement prefers commit message index", () => {
  const tracker = new WorkflowEventTracker();
  const messages: AgentMessage[] = [
    createMockCommitMessage("abcd1234567890abcd1234567890abcd12345678", 0),
    createMockWorkflowMessage({ idx: 2 }),
  ];

  tracker.processMessages(messages);

  const groups = tracker.getEventGroups();
  const group = groups.values().next().value;
  const placement = tracker.getSummaryPlacement(group);

  expect(placement).toBe(0);
});

// Test getSummaryPlacement fallback to first event index
test("getSummaryPlacement falls back to first event index", () => {
  const tracker = new WorkflowEventTracker();
  // Create messages array with empty slots to simulate index 5
  const messages: AgentMessage[] = new Array(6);
  messages[5] = createMockWorkflowMessage({ idx: 5 });

  tracker.processMessages(messages);

  const groups = tracker.getEventGroups();
  const group = groups.values().next().value;

  const placement = tracker.getSummaryPlacement(group);
  expect(placement).toBe(5);
});

// Test shouldHideMessage hides workflow messages not at summary location
test("shouldHideMessage hides workflow messages not at summary location", () => {
  const tracker = new WorkflowEventTracker();
  const messages: AgentMessage[] = [
    createMockCommitMessage("abcd1234567890abcd1234567890abcd12345678", 0),
    createMockWorkflowMessage({ idx: 1 }),
    createMockWorkflowMessage({ idx: 2 }),
  ];

  tracker.processMessages(messages);

  // Messages at index 1 and 2 should be hidden (summary is at index 0)
  expect(tracker.shouldHideMessage(messages[1], 1)).toBe(true);
  expect(tracker.shouldHideMessage(messages[2], 2)).toBe(true);

  // Non-workflow messages should not be hidden
  expect(tracker.shouldHideMessage(messages[0], 0)).toBe(false);
});

test("getWorkflowSummaryForIndex returns correct group", () => {
  const tracker = new WorkflowEventTracker();
  const messages: AgentMessage[] = [
    createMockCommitMessage("abcd1234567890abcd1234567890abcd12345678", 0),
    createMockWorkflowMessage({ idx: 1 }),
  ];

  tracker.processMessages(messages);

  const summary = tracker.getWorkflowSummaryForIndex(0);
  expect(summary).not.toBeNull();
  expect(summary!.commitSha).toBe("abcd1234567890abcd1234567890abcd12345678");
  const noSummary = tracker.getWorkflowSummaryForIndex(5);
  expect(noSummary).toBeNull();
});

// Test event system
test("event system works", () => {
  const tracker = new WorkflowEventTracker();
  let notified = false;
  let receivedGroups: Map<string, any> | null = null;
  let receivedChangedKeys: string[] | undefined;

  const handler = (event: WorkflowEvent) => {
    notified = true;
    receivedGroups = event.detail.groups;
    receivedChangedKeys = event.detail.changedKeys;
  };

  tracker.addEventListener("groupsUpdated", handler);

  const messages: AgentMessage[] = [createMockWorkflowMessage({ idx: 0 })];

  tracker.processMessages(messages);

  expect(notified).toBe(true);
  expect(receivedGroups).not.toBeNull();
  expect(receivedGroups!.size).toBe(1);
  expect(receivedChangedKeys).toEqual([
    "main:abcd1234567890abcd1234567890abcd12345678",
  ]);

  tracker.removeEventListener("groupsUpdated", handler);
});

// Test removeEventListener removes listeners
test("removeEventListener removes listeners", () => {
  const tracker = new WorkflowEventTracker();
  let notificationCount = 0;

  const handler = () => {
    notificationCount++;
  };

  tracker.addEventListener("groupsUpdated", handler);

  const messages: AgentMessage[] = [createMockWorkflowMessage({ idx: 0 })];

  tracker.processMessages(messages);
  expect(notificationCount).toBe(1);

  tracker.removeEventListener("groupsUpdated", handler);
  tracker.processMessages(messages);
  expect(notificationCount).toBe(1);
});

// Test ignores non-workflow messages
test("ignores non-workflow messages", () => {
  const tracker = new WorkflowEventTracker();
  const messages: AgentMessage[] = [
    {
      type: "user",
      content: "Hello",
      timestamp: "2024-01-01T12:00:00Z",
      conversation_id: "test-conv",
      end_of_turn: false,
      idx: 0,
    },
    {
      type: "external",
      content: "Other external message",
      timestamp: "2024-01-01T12:01:00Z",
      conversation_id: "test-conv",
      end_of_turn: false,
      idx: 1,
      external_message: {
        message_type: "other_type",
        body: {},
        text_content: "Other message",
      },
    },
  ];

  tracker.processMessages(messages);

  const groups = tracker.getEventGroups();
  expect(groups.size).toBe(0);
});

// Test AbortController cleanup works
test("AbortController cleanup works", () => {
  const tracker = new WorkflowEventTracker();
  let notificationCount = 0;

  const abortController = new AbortController();
  const handler = () => {
    notificationCount++;
  };

  tracker.addEventListener("groupsUpdated", handler, {
    signal: abortController.signal,
  });

  const messages: AgentMessage[] = [createMockWorkflowMessage({ idx: 0 })];

  tracker.processMessages(messages);
  expect(notificationCount).toBe(1);

  abortController.abort();
  tracker.processMessages(messages);
  expect(notificationCount).toBe(1);
});

// Test { once: true } option works
test("once option works", () => {
  const tracker = new WorkflowEventTracker();
  let notificationCount = 0;

  const handler = () => {
    notificationCount++;
  };

  tracker.addEventListener("groupsUpdated", handler, { once: true });

  const messages: AgentMessage[] = [createMockWorkflowMessage({ idx: 0 })];

  tracker.processMessages(messages);
  expect(notificationCount).toBe(1);

  tracker.processMessages(messages);
  expect(notificationCount).toBe(1);
});
