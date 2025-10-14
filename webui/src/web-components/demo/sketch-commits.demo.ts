/**
 * Demo module for sketch-commits component
 */

import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";
import type {
  GitCommit,
  State,
  AgentMessage,
  ExternalMessage,
} from "../../types";
import { workflowEventTracker } from "../../services/workflow-event-tracker";

// Sample commit data for demonstrations
const sampleCommits: GitCommit[] = [
  {
    hash: "a1b2c3d4e5f6789012345678901234567890abcd",
    subject: "Fix critical authentication bug",
    body: "Resolved issue where users could bypass login validation\n\nThis fix ensures proper session validation and prevents\nunauthorized access to protected routes.\n\nSigned-off-by: Developer <dev@example.com>",
    pushed_branch: "main",
  },
  {
    hash: "f7e8d9c0b1a2345678901234567890123456789e",
    subject: "Add drag and drop file upload component",
    body: "Implemented new FileUpload component with full drag/drop support\n\n- Support for multiple file selection\n- File type and size validation\n- Progress tracking for uploads\n- Accessible keyboard navigation\n\nCloses #123\n\nSigned-off-by: Developer <dev@example.com>",
    pushed_branch: "feature/file-upload",
  },
  {
    hash: "9876543210fedcba098765432109876543210fedc",
    subject: "Update documentation for API endpoints",
    body: "Added comprehensive documentation for all REST API endpoints\n\nIncludes examples, parameter descriptions, and response formats.\n\nSigned-off-by: Technical Writer <writer@example.com>",
    pushed_branch: "docs/api-update",
  },
];

const longCommitExample: GitCommit[] = [
  {
    hash: "1234567890abcdef1234567890abcdef12345678",
    subject:
      "Refactor authentication system with comprehensive security improvements",
    body: "This is a major refactoring of the authentication system that addresses multiple security concerns and improves overall system robustness.\n\n## Changes Made\n\n### Security Improvements\n- Implemented proper password hashing with bcrypt\n- Added rate limiting to prevent brute force attacks\n- Enhanced session management with secure cookies\n- Added CSRF protection for all forms\n\n### Code Quality\n- Refactored authentication middleware for better maintainability\n- Added comprehensive unit tests (95% coverage)\n- Improved error handling and logging\n- Added TypeScript types for better type safety\n\n### Performance\n- Optimized database queries for user lookup\n- Implemented caching for frequently accessed user data\n- Reduced authentication response time by 40%\n\n## Breaking Changes\n\n- Authentication API endpoints now require CSRF tokens\n- Session cookie format has changed (existing sessions will be invalidated)\n- Some authentication error codes have been updated\n\n## Migration Guide\n\n1. Update client code to include CSRF tokens\n2. Inform users that they will need to log in again\n3. Update any integration tests that depend on old error codes\n\nTested extensively in staging environment with full regression test suite.\n\nFixes: #456, #789, #101112\nCloses: #131415\nRefs: #161718\n\nSigned-off-by: Senior Developer <senior@example.com>\nReviewed-by: Security Team <security@example.com>",
    pushed_branch: "security/auth-refactor",
  },
];

// Commits without pushed branches (local commits)
const localCommits: GitCommit[] = [
  {
    hash: "abcdef1234567890abcdef1234567890abcdef12",
    subject: "WIP: Working on new feature",
    body: "This is a work-in-progress commit that hasn't been pushed yet.\n\nStill needs testing and code review before pushing to remote.",
    // No pushed_branch - represents a local commit
  },
  {
    hash: "567890abcdef1234567890abcdef1234567890ab",
    subject: "Quick fix for local development",
    body: "Temporary fix for local development environment.",
    // No pushed_branch
  },
];

// Mixed commits (some pushed, some local)
const mixedCommits: GitCommit[] = [
  ...sampleCommits.slice(0, 2),
  ...localCommits.slice(0, 1),
  sampleCommits[2],
];

// Mock state configurations
const createMockState = (overrides: Partial<State> = {}): State => {
  return {
    session_id: "demo-session",
    git_username: "demo-user",
    link_to_github: true,
    git_origin: "https://github.com/boldsoftware/bold.git",
    ...overrides,
  } as State;
};

// Helper function to create AgentMessage with WorkflowRunEvent
const createWorkflowMessage = (
  workflowName: string,
  commitHash: string,
  branch: string,
  status?: string,
  conclusion?: string,
): AgentMessage => {
  // Create a minimal WorkflowRunEvent object with just the required fields
  const workflowRunEvent = {
    action: "completed",
    workflow: {
      id: 123456,
      name: workflowName,
      path: ".github/workflows/ci.yml",
      state: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      url: "https://api.github.com/repos/boldsoftware/bold/actions/workflows/123456",
      html_url: "https://github.com/boldsoftware/bold/actions/workflows/ci.yml",
      badge_url: "https://github.com/boldsoftware/bold/workflows/CI/badge.svg",
    },
    workflow_run: {
      id: Math.floor(Math.random() * 1000000),
      name: workflowName,
      head_branch: branch || "main",
      head_sha: commitHash,
      path: ".github/workflows/ci.yml",
      run_number: Math.floor(Math.random() * 100) + 1,
      event: "push",
      status: status || "completed",
      conclusion: conclusion || null,
      workflow_id: 123456,
      check_suite_id: 789012,
      check_suite_node_id: "CS_node_id",
      url:
        "https://api.github.com/repos/boldsoftware/bold/actions/runs/" +
        Math.floor(Math.random() * 1000000),
      html_url:
        "https://github.com/boldsoftware/bold/actions/runs/" +
        Math.floor(Math.random() * 1000000),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      run_attempt: 1,
      referenced_workflows: [],
      run_started_at: new Date().toISOString(),
      jobs_url:
        "https://api.github.com/repos/boldsoftware/bold/actions/runs/" +
        Math.floor(Math.random() * 1000000) +
        "/jobs",
      logs_url:
        "https://api.github.com/repos/boldsoftware/bold/actions/runs/" +
        Math.floor(Math.random() * 1000000) +
        "/logs",
      check_suite_url:
        "https://api.github.com/repos/boldsoftware/bold/check-suites/789012",
      artifacts_url:
        "https://api.github.com/repos/boldsoftware/bold/actions/runs/" +
        Math.floor(Math.random() * 1000000) +
        "/artifacts",
      cancel_url:
        "https://api.github.com/repos/boldsoftware/bold/actions/runs/" +
        Math.floor(Math.random() * 1000000) +
        "/cancel",
      rerun_url:
        "https://api.github.com/repos/boldsoftware/bold/actions/runs/" +
        Math.floor(Math.random() * 1000000) +
        "/rerun",
      previous_attempt_url: null,
      workflow_url:
        "https://api.github.com/repos/boldsoftware/bold/actions/workflows/123456",
      head_commit: {
        id: commitHash,
        tree_id: "tree_" + commitHash.substring(0, 8),
        message: "Sample commit for demo",
        timestamp: new Date().toISOString(),
        author: {
          name: "Demo User",
          email: "demo@example.com",
        },
        committer: {
          name: "Demo User",
          email: "demo@example.com",
        },
      },
    },
  };

  const externalMessage: ExternalMessage = {
    message_type: "github_workflow_run",
    body: workflowRunEvent,
    text_content: `Workflow ${workflowRunEvent.workflow.name} ${conclusion || status} for commit ${commitHash.substring(0, 8)}`,
  };

  return {
    type: "external",
    end_of_turn: false,
    content: "",
    external_message: externalMessage,
    timestamp: new Date().toISOString(),
    conversation_id: "demo-conversation",
    idx: Math.floor(Math.random() * 1000),
  } as AgentMessage;
};

const demo: DemoModule = {
  title: "Commits Component Demo",
  description:
    "Interactive demo showing commit display with various configurations",
  imports: ["../sketch-commits", "../sketch-workflow-status-summary"],
  styles: ["/dist/tailwind.css"],

  setup: async (container: HTMLElement) => {
    // Create demo sections
    const basicSection = demoUtils.createDemoSection(
      "Basic Commit Display",
      "Standard commit display with GitHub integration",
    );

    const interactiveSection = demoUtils.createDemoSection(
      "Interactive Examples",
      "Test copy functionality and commit interactions",
    );

    const workflowStatusSection = demoUtils.createDemoSection(
      "Workflow Status Testing",
      "Test workflow status events for each commit",
    );

    const configurationsSection = demoUtils.createDemoSection(
      "Different Configurations",
      "Commits with various settings and states",
    );

    const edgeCasesSection = demoUtils.createDemoSection(
      "Edge Cases",
      "Special scenarios and long commit messages",
    );

    // Basic commits component
    const basicCommits = document.createElement("sketch-commits") as any;
    basicCommits.commits = sampleCommits;
    basicCommits.state = createMockState();

    // Interactive commits component
    const interactiveCommits = document.createElement("sketch-commits") as any;
    interactiveCommits.commits = sampleCommits.slice(0, 2);
    interactiveCommits.state = createMockState();

    // Control buttons for interaction
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText =
      "margin-top: 15px; display: flex; flex-wrap: wrap; gap: 10px;";

    const addCommitButton = demoUtils.createButton("Add Commit", () => {
      const currentCommits = interactiveCommits.commits || [];
      const availableCommits = sampleCommits.filter(
        (commit) =>
          !currentCommits.some((c: GitCommit) => c.hash === commit.hash),
      );
      if (availableCommits.length > 0) {
        interactiveCommits.commits = [...currentCommits, availableCommits[0]];
      }
    });

    const removeCommitButton = demoUtils.createButton("Remove Last", () => {
      const currentCommits = interactiveCommits.commits || [];
      if (currentCommits.length > 0) {
        interactiveCommits.commits = currentCommits.slice(0, -1);
      }
    });

    const clearCommitsButton = demoUtils.createButton("Clear All", () => {
      interactiveCommits.commits = [];
    });

    const resetCommitsButton = demoUtils.createButton("Reset", () => {
      interactiveCommits.commits = sampleCommits.slice(0, 2);
    });

    controlsDiv.appendChild(addCommitButton);
    controlsDiv.appendChild(removeCommitButton);
    controlsDiv.appendChild(clearCommitsButton);
    controlsDiv.appendChild(resetCommitsButton);

    // Configuration examples
    const configContainer = document.createElement("div");

    // Without GitHub integration
    const noGithubHeader = document.createElement("h4");
    noGithubHeader.textContent = "Without GitHub Integration";
    noGithubHeader.style.cssText =
      "margin: 20px 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

    const noGithubCommits = document.createElement("sketch-commits") as any;
    noGithubCommits.commits = sampleCommits.slice(0, 2);
    noGithubCommits.state = createMockState({ link_to_github: false });

    // Local commits only
    const localHeader = document.createElement("h4");
    localHeader.textContent = "Local Commits (Not Pushed)";
    localHeader.style.cssText =
      "margin: 20px 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

    const localCommitsComponent = document.createElement(
      "sketch-commits",
    ) as any;
    localCommitsComponent.commits = localCommits;
    localCommitsComponent.state = createMockState();

    // Mixed commits
    const mixedHeader = document.createElement("h4");
    mixedHeader.textContent = "Mixed (Pushed + Local) Commits";
    mixedHeader.style.cssText =
      "margin: 20px 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

    const mixedCommitsComponent = document.createElement(
      "sketch-commits",
    ) as any;
    mixedCommitsComponent.commits = mixedCommits;
    mixedCommitsComponent.state = createMockState();

    configContainer.appendChild(noGithubHeader);
    configContainer.appendChild(noGithubCommits);
    configContainer.appendChild(localHeader);
    configContainer.appendChild(localCommitsComponent);
    configContainer.appendChild(mixedHeader);
    configContainer.appendChild(mixedCommitsComponent);

    // Edge cases
    const edgeCasesContainer = document.createElement("div");

    // Single commit
    const singleHeader = document.createElement("h4");
    singleHeader.textContent = "Single Commit";
    singleHeader.style.cssText =
      "margin: 20px 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

    const singleCommit = document.createElement("sketch-commits") as any;
    singleCommit.commits = [sampleCommits[0]];
    singleCommit.state = createMockState();

    // Long commit message
    const longHeader = document.createElement("h4");
    longHeader.textContent = "Long Commit Message";
    longHeader.style.cssText =
      "margin: 20px 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

    const longCommit = document.createElement("sketch-commits") as any;
    longCommit.commits = longCommitExample;
    longCommit.state = createMockState();

    // Empty state
    const emptyHeader = document.createElement("h4");
    emptyHeader.textContent = "Empty State (No Commits)";
    emptyHeader.style.cssText =
      "margin: 20px 0 10px 0; color: var(--demo-label-color); font-size: 14px; font-weight: 600;";

    const emptyCommits = document.createElement("sketch-commits") as any;
    emptyCommits.commits = [];
    emptyCommits.state = createMockState();

    const emptyNote = document.createElement("p");
    emptyNote.textContent =
      "When there are no commits, the component renders nothing.";
    emptyNote.style.cssText =
      "color: #666; font-style: italic; margin: 10px 0;";

    edgeCasesContainer.appendChild(singleHeader);
    edgeCasesContainer.appendChild(singleCommit);
    edgeCasesContainer.appendChild(longHeader);
    edgeCasesContainer.appendChild(longCommit);
    edgeCasesContainer.appendChild(emptyHeader);
    edgeCasesContainer.appendChild(emptyCommits);
    edgeCasesContainer.appendChild(emptyNote);

    // Event listeners for commit interactions
    container.addEventListener("show-commit-diff", (event: any) => {
      const commitHash = event.detail.commitHash;
      // Create a temporary notification
      const notification = document.createElement("div");
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4f46e5;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      notification.textContent = `Commit diff requested: ${commitHash.substring(0, 8)}`;
      document.body.appendChild(notification);

      // Remove notification after 3 seconds
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    });

    // Assemble the demo
    basicSection.appendChild(basicCommits);

    interactiveSection.appendChild(interactiveCommits);
    interactiveSection.appendChild(controlsDiv);

    // Workflow status testing section
    const workflowContainer = document.createElement("div");

    const commitSelector: HTMLSelectElement = document.createElement("select");
    commitSelector.style.cssText = `
      margin: 10px;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      color: #333;
    `;
    sampleCommits.forEach((commit) => {
      const option = document.createElement("option");
      option.value = commit.hash;
      option.textContent = `${commit.hash.substring(0, 8)} - ${commit.subject}`;
      commitSelector.appendChild(option);
    });
    workflowContainer.appendChild(commitSelector);

    const workflowNames = ["Presubmit", "Build and Test", "Deploy to Staging"];
    const workflowSelector = document.createElement("select");
    workflowSelector.style.cssText = `
      margin: 10px;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      color: #333;
    `;
    workflowNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      workflowSelector.appendChild(option);
    });
    workflowContainer.appendChild(workflowSelector);

    // Queued button
    const queuedBtn = demoUtils.createButton("Queued", () => {
      const commit = sampleCommits.find((c) => c.hash === commitSelector.value);
      if (!commit) return;

      const message = createWorkflowMessage(
        workflowSelector.value,
        commit.hash,
        commit.pushed_branch || "main",
        "queued",
        undefined,
      );
      workflowEventTracker.processMessages([message]);

      // Show notification
      const notification = document.createElement("div");
      notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #6b7280;
          color: white;
          padding: 12px 20px;
          border-radius: 6px;
          z-index: 1000;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
      notification.textContent = `Queued workflow event sent for ${commit.hash.substring(0, 8)}`;
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
    });
    queuedBtn.style.cssText +=
      "background: #6b7280; color: white; border: none;";
    workflowContainer.appendChild(queuedBtn);

    // In Progress button
    const inProgressBtn = demoUtils.createButton("In Progress", () => {
      const commit = sampleCommits.find((c) => c.hash === commitSelector.value);
      if (!commit) return;

      const message = createWorkflowMessage(
        workflowSelector.value,
        commit.hash,
        commit.pushed_branch || "main",
        "in_progress",
        undefined,
      );
      workflowEventTracker.processMessages([message]);

      // Show notification
      const notification = document.createElement("div");
      notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #f59e0b;
          color: white;
          padding: 12px 20px;
          border-radius: 6px;
          z-index: 1000;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
      notification.textContent = `In Progress workflow event sent for ${commit.hash.substring(0, 8)}`;
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
    });
    inProgressBtn.style.cssText +=
      "background: #f59e0b; color: white; border: none;";
    workflowContainer.appendChild(inProgressBtn);

    // Success button
    const successBtn = demoUtils.createButton("Success", () => {
      const commit = sampleCommits.find((c) => c.hash === commitSelector.value);
      if (!commit) return;
      const message = createWorkflowMessage(
        workflowSelector.value,
        commit.hash,
        commit.pushed_branch || "main",
        undefined,
        "success",
      );
      workflowEventTracker.processMessages([message]);

      // Show notification
      const notification = document.createElement("div");
      notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 6px;
          z-index: 1000;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
      notification.textContent = `Success workflow event sent for ${commit.hash.substring(0, 8)}`;
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
    });
    successBtn.style.cssText +=
      "background: #10b981; color: white; border: none;";
    workflowContainer.appendChild(successBtn);

    // Failure button
    const failureBtn = demoUtils.createButton("Failure", () => {
      const commit = sampleCommits.find((c) => c.hash === commitSelector.value);
      if (!commit) return;
      const message = createWorkflowMessage(
        workflowSelector.value,
        commit.hash,
        commit.pushed_branch || "main",
        undefined,
        "failure",
      );
      workflowEventTracker.processMessages([message]);

      // Show notification
      const notification = document.createElement("div");
      notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 12px 20px;
          border-radius: 6px;
          z-index: 1000;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
      notification.textContent = `Failure workflow event sent for ${commit.hash.substring(0, 8)}`;
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
    });
    failureBtn.style.cssText +=
      "background: #ef4444; color: white; border: none;";
    workflowContainer.appendChild(failureBtn);

    workflowStatusSection.appendChild(workflowContainer);

    configurationsSection.appendChild(configContainer);
    edgeCasesSection.appendChild(edgeCasesContainer);

    container.appendChild(basicSection);
    container.appendChild(interactiveSection);
    container.appendChild(workflowStatusSection);
    container.appendChild(configurationsSection);
    container.appendChild(edgeCasesSection);

    // Add demo-specific styles
    const demoStyles = document.createElement("style");
    demoStyles.textContent = `
      /* Demo-specific enhancements */
      .demo-container sketch-commits {
        margin: 10px 0;
      }

      /* Ensure proper spacing for demo layout */
      .demo-section {
        margin-bottom: 30px;
      }

      /* Style the control buttons */
      .demo-container button {
        margin-right: 8px;
        margin-bottom: 8px;
      }
    `;
    document.head.appendChild(demoStyles);
  },

  cleanup: async () => {
    // Remove demo-specific styles
    const demoStyles = document.querySelector('style[data-demo="commits"]');
    if (demoStyles) {
      demoStyles.remove();
    }
  },
};

export default demo;
