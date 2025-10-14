import { test, expect } from "@sand4rt/experimental-ct-web";
import { SketchWorkflowStatusSummary } from "./sketch-workflow-status-summary";
import { AgentMessage } from "../types";

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

test("renders nothing when no workflow messages", async ({ mount }) => {
  const messages: AgentMessage[] = [
    {
      type: "user",
      content: "Hello",
      timestamp: "2024-01-01T12:00:00Z",
      conversation_id: "test-conv",
      end_of_turn: false,
      idx: 0,
    },
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
    },
  });

  const content = await component.textContent();
  expect(content?.trim()).toBe("");
});

test("renders workflow status badges", async ({ mount }) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
        timestamp: "2024-01-01T12:00:00Z",
      },
      {
        workflow: { name: "CI" },
        workflow_run: {
          status: "completed",
          conclusion: "success",
        },
      },
    ),
    createMockWorkflowMessage(
      {
        idx: 1,
        timestamp: "2024-01-01T12:05:00Z",
      },
      {
        workflow: { name: "Tests" },
        workflow_run: {
          status: "completed",
          conclusion: "failure",
        },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
    },
  });

  // Should show workflow badges (use more specific selectors)
  const ciBadge = component.locator('summary span:has-text("CI")').first();
  const testsBadge = component
    .locator('summary span:has-text("Tests")')
    .first();

  await expect(ciBadge).toBeVisible();
  await expect(testsBadge).toBeVisible();

  // Check that badges have appropriate styling classes
  await expect(ciBadge).toHaveClass(/text-green-/);
  await expect(testsBadge).toHaveClass(/text-red-/);
});

test("shows workflow details when expanded", async ({ mount }) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
        timestamp: "2024-01-01T12:00:00Z",
      },
      {
        workflow: { name: "CI" },
        workflow_run: {
          status: "completed",
          conclusion: "success",
        },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
    },
  });

  // Initially details should be collapsed
  const details = component.locator("details");
  await expect(details).not.toHaveAttribute("open");

  // Click to expand
  await component.locator("summary").click();

  // Should now be expanded
  await expect(details).toHaveAttribute("open");

  // Should show event details in the expanded section
  await expect(
    component.locator('.space-y-1 .font-medium:has-text("CI")'),
  ).toBeVisible();
  await expect(
    component.locator('.space-y-1 span:has-text("success")'),
  ).toBeVisible();
});

test("filters by branch when branch prop is provided", async ({ mount }) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
      },
      {
        workflow_run: {
          head_branch: "main",
        },
      },
    ),
    createMockWorkflowMessage(
      {
        idx: 1,
      },
      {
        workflow_run: {
          head_branch: "feature",
        },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
      branch: "main",
    },
  });

  // Should only show main branch workflows
  const summaryElements = component.locator("details");
  await expect(summaryElements).toHaveCount(1);
});

test("filters by commit when commit prop is provided", async ({ mount }) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
      },
      {
        workflow_run: {
          head_sha: "abcd1234567890abcd1234567890abcd12345678",
        },
      },
    ),
    createMockWorkflowMessage(
      {
        idx: 1,
      },
      {
        workflow_run: {
          head_sha: "efgh5678901234efgh5678901234efgh56789012",
        },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
      commit: "abcd123", // partial commit hash
    },
  });

  // Should only show matching commit workflows
  const summaryElements = component.locator("details");
  await expect(summaryElements).toHaveCount(1);
});

test("shows 'No matching workflow runs' when filters don't match", async ({
  mount,
}) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
      },
      {
        workflow_run: {
          head_branch: "main",
        },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
      branch: "nonexistent",
    },
  });

  await expect(
    component.locator("text=No matching workflow runs"),
  ).toBeVisible();
});

test("handles different workflow statuses and conclusions", async ({
  mount,
}) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
      },
      {
        workflow: { name: "Success" },
        workflow_run: {
          status: "completed",
          conclusion: "success",
        },
      },
    ),
    createMockWorkflowMessage(
      {
        idx: 1,
      },
      {
        workflow: { name: "Failure" },
        workflow_run: {
          status: "completed",
          conclusion: "failure",
        },
      },
    ),
    createMockWorkflowMessage(
      {
        idx: 2,
      },
      {
        workflow: { name: "InProgress" },
        workflow_run: {
          status: "in_progress",
          conclusion: null,
        },
      },
    ),
    createMockWorkflowMessage(
      {
        idx: 3,
      },
      {
        workflow: { name: "Queued" },
        workflow_run: {
          status: "queued",
          conclusion: null,
        },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
    },
  });

  // Check that all workflow types are rendered (use more specific selectors for badges)
  const successBadge = component
    .locator('summary span:has-text("Success")')
    .first();
  const failureBadge = component
    .locator('summary span:has-text("Failure")')
    .first();
  const inProgressBadge = component
    .locator('summary span:has-text("InProgress")')
    .first();
  const queuedBadge = component
    .locator('summary span:has-text("Queued")')
    .first();

  await expect(successBadge).toBeVisible();
  await expect(failureBadge).toBeVisible();
  await expect(inProgressBadge).toBeVisible();
  await expect(queuedBadge).toBeVisible();

  // Check color coding
  await expect(successBadge).toHaveClass(/text-green-/);
  await expect(failureBadge).toHaveClass(/text-red-/);
  await expect(inProgressBadge).toHaveClass(/text-yellow-/);
  await expect(queuedBadge).toHaveClass(/text-gray-/);
});

test("sorts workflows alphabetically by name", async ({ mount }) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
      },
      {
        workflow: { name: "Zebra" },
      },
    ),
    createMockWorkflowMessage(
      {
        idx: 1,
      },
      {
        workflow: { name: "Alpha" },
      },
    ),
    createMockWorkflowMessage(
      {
        idx: 2,
      },
      {
        workflow: { name: "Beta" },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
    },
  });

  // Check that all workflows are rendered and count them first
  const workflowBadges = component.locator("summary .inline-flex span");
  await expect(workflowBadges).toHaveCount(3);

  // Check alphabetical order by checking the text content of each badge
  const badgeTexts = await workflowBadges.allTextContents();
  expect(badgeTexts).toEqual(["Alpha", "Beta", "Zebra"]);
});

test("handles workflows with different commit hashes separately", async ({
  mount,
}) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
      },
      {
        workflow: { name: "CI" },
        workflow_run: {
          head_sha: "commit1234567890abcdef1234567890abcdef123456",
        },
      },
    ),
    createMockWorkflowMessage(
      {
        idx: 1,
      },
      {
        workflow: { name: "CI" },
        workflow_run: {
          head_sha: "commit2345678901abcdef2345678901abcdef234567",
        },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
    },
  });

  // Should show two separate summaries (different commits)
  const summaryElements = component.locator("details");
  await expect(summaryElements).toHaveCount(2);
});

test("formats timestamps correctly in details view", async ({ mount }) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
        timestamp: "2024-01-15T14:30:45Z",
      },
      {
        workflow: { name: "CI" },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
    },
  });

  // Expand details
  await component.locator("summary").click();

  // Should show formatted timestamp (check for the date part, time format may vary by timezone)
  await expect(component).toContainText("Jan 15, 2024");
  // Note: Time format may vary by system timezone, so we check for presence of time elements
  await expect(component).toContainText(":30:45");
});

test.skip("animates spinning icon for in-progress workflows", async ({
  mount,
}) => {
  const messages: AgentMessage[] = [
    createMockWorkflowMessage(
      {
        idx: 0,
      },
      {
        workflow: { name: "CI" },
        workflow_run: {
          status: "in_progress",
          conclusion: null,
        },
      },
    ),
  ];

  const component = await mount(SketchWorkflowStatusSummary, {
    props: {
      messages,
    },
  });

  // Should have spinning animation
  const spinningIcon = component.locator(".animate-spin");
  await expect(spinningIcon).toBeVisible();
});
