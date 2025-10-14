import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";
import { SketchWorkflowStatusSummary } from "../sketch-workflow-status-summary";
import { AgentMessage } from "../../types";

const demo: DemoModule = {
  title: "Workflow Status Summary Demo",
  description:
    "Different UI variations for consolidated GitHub workflow status display",
  imports: ["../sketch-workflow-status-summary.ts"],

  setup: async (container: HTMLElement) => {
    // Mock timeline messages with GitHub workflow run events
    const mockMessages: AgentMessage[] = [
      // Branch: main, Commit: abc123...
      {
        type: "external",
        end_of_turn: false,
        content: "Workflow run started",
        external_message: {
          message_type: "github_workflow_run",
          body: {
            workflow: { name: "go_tests" },
            workflow_run: {
              id: 123456789,
              status: "completed",
              conclusion: "success",
              head_branch: "main",
              head_sha: "abc123deadbeef1234567890abcdef",
              html_url:
                "https://github.com/example/repo/actions/runs/123456789",
            },
          },
          text_content: "Go tests completed successfully",
        },
        timestamp: "2024-01-15T10:00:00Z",
        conversation_id: "demo",
        idx: 0,
      },
      {
        type: "external",
        end_of_turn: false,
        content: "Workflow run started",
        external_message: {
          message_type: "github_workflow_run",
          body: {
            workflow: { name: "lint" },
            workflow_run: {
              id: 123456790,
              status: "completed",
              conclusion: "success",
              head_branch: "main",
              head_sha: "abc123deadbeef1234567890abcdef",
              html_url:
                "https://github.com/example/repo/actions/runs/123456790",
            },
          },
          text_content: "Linting completed successfully",
        },
        timestamp: "2024-01-15T10:01:00Z",
        conversation_id: "demo",
        idx: 1,
      },
      {
        type: "external",
        end_of_turn: false,
        content: "Workflow run started",
        external_message: {
          message_type: "github_workflow_run",
          body: {
            workflow: { name: "security_scan" },
            workflow_run: {
              id: 123456791,
              status: "completed",
              conclusion: "failure",
              head_branch: "main",
              head_sha: "abc123deadbeef1234567890abcdef",
              html_url:
                "https://github.com/example/repo/actions/runs/123456791",
            },
          },
          text_content: "Security scan failed",
        },
        timestamp: "2024-01-15T10:02:00Z",
        conversation_id: "demo",
        idx: 2,
      },
      {
        type: "external",
        end_of_turn: false,
        content: "Workflow run started",
        external_message: {
          message_type: "github_workflow_run",
          body: {
            workflow: { name: "build" },
            workflow_run: {
              id: 123456792,
              status: "in_progress",
              conclusion: null,
              head_branch: "main",
              head_sha: "abc123deadbeef1234567890abcdef",
              html_url:
                "https://github.com/example/repo/actions/runs/123456792",
            },
          },
          text_content: "Build in progress",
        },
        timestamp: "2024-01-15T10:03:00Z",
        conversation_id: "demo",
        idx: 3,
      },

      // Branch: feature/new-ui, Commit: def456...
      {
        type: "external",
        end_of_turn: false,
        content: "Workflow run started",
        external_message: {
          message_type: "github_workflow_run",
          body: {
            workflow: { name: "go_tests" },
            workflow_run: {
              id: 123456793,
              status: "completed",
              conclusion: "success",
              head_branch: "feature/new-ui",
              head_sha: "def456deadbeef1234567890abcdef",
              html_url:
                "https://github.com/example/repo/actions/runs/123456793",
            },
          },
          text_content: "Go tests completed successfully",
        },
        timestamp: "2024-01-15T10:04:00Z",
        conversation_id: "demo",
        idx: 4,
      },
      {
        type: "external",
        end_of_turn: false,
        content: "Workflow run started",
        external_message: {
          message_type: "github_workflow_run",
          body: {
            workflow: { name: "lint" },
            workflow_run: {
              id: 123456794,
              status: "queued",
              conclusion: null,
              head_branch: "feature/new-ui",
              head_sha: "def456deadbeef1234567890abcdef",
              html_url:
                "https://github.com/example/repo/actions/runs/123456794",
            },
          },
          text_content: "Linting queued",
        },
        timestamp: "2024-01-15T10:05:00Z",
        conversation_id: "demo",
        idx: 5,
      },

      // Older event for same workflow (should be ignored)
      {
        type: "external",
        end_of_turn: false,
        content: "Workflow run started",
        external_message: {
          message_type: "github_workflow_run",
          body: {
            workflow: { name: "go_tests" },
            workflow_run: {
              id: 123456788,
              status: "completed",
              conclusion: "failure",
              head_branch: "main",
              head_sha: "abc123deadbeef1234567890abcdef",
              html_url:
                "https://github.com/example/repo/actions/runs/123456788",
            },
          },
          text_content: "Go tests failed (older event)",
        },
        timestamp: "2024-01-15T09:59:00Z", // Earlier timestamp
        conversation_id: "demo",
        idx: 6,
      },
    ];

    const section = demoUtils.createDemoSection(
      "Workflow Status Summary Variations",
      "Different UI approaches for displaying consolidated GitHub workflow statuses",
    );

    const variantSection = document.createElement("div");
    variantSection.style.marginBottom = "3rem";
    variantSection.style.border = "1px solid #eee";
    variantSection.style.borderRadius = "8px";
    variantSection.style.padding = "1.5rem";
    variantSection.style.backgroundColor = "#fafafa";

    const header = document.createElement("h3");
    header.style.marginTop = "0";
    header.style.marginBottom = "0.5rem";
    header.style.color = "var(--demo-fixture-text-color)";
    header.style.fontSize = "1.2rem";
    header.style.fontWeight = "600";
    variantSection.appendChild(header);

    const desc = document.createElement("p");
    desc.style.marginBottom = "1.5rem";
    desc.style.color = "var(--demo-fixture-text-color)";
    desc.style.fontSize = "0.9rem";
    desc.style.opacity = "0.8";
    variantSection.appendChild(desc);

    const component = document.createElement(
      "sketch-workflow-status-summary",
    ) as SketchWorkflowStatusSummary;
    component.messages = mockMessages;

    variantSection.appendChild(component);
    section.appendChild(variantSection);

    // Add filtered examples
    const filterSection = document.createElement("div");
    filterSection.style.marginTop = "3rem";
    filterSection.style.border = "1px solid #ddd";
    filterSection.style.borderRadius = "8px";
    filterSection.style.padding = "1.5rem";
    filterSection.style.backgroundColor = "#f8f9fa";

    const filterHeader = document.createElement("h3");
    filterHeader.textContent = "Filtered Examples";
    filterHeader.style.marginTop = "0";
    filterHeader.style.marginBottom = "1.5rem";
    filterHeader.style.color = "var(--demo-fixture-text-color)";
    filterSection.appendChild(filterHeader);

    // Main branch only
    const mainBranchDiv = document.createElement("div");
    mainBranchDiv.style.marginBottom = "2rem";
    const mainBranchLabel = document.createElement("h4");
    mainBranchLabel.textContent = "Main Branch Only (badges variant)";
    mainBranchLabel.style.marginBottom = "1rem";
    mainBranchLabel.style.fontSize = "1rem";
    mainBranchDiv.appendChild(mainBranchLabel);

    const mainBranchComponent = document.createElement(
      "sketch-workflow-status-summary",
    ) as SketchWorkflowStatusSummary;
    mainBranchComponent.messages = mockMessages;
    mainBranchComponent.branch = "main";
    mainBranchDiv.appendChild(mainBranchComponent);
    filterSection.appendChild(mainBranchDiv);

    // Specific commit
    const commitDiv = document.createElement("div");
    const commitLabel = document.createElement("h4");
    commitLabel.textContent = "Specific Commit (def456...) - compact variant";
    commitLabel.style.marginBottom = "1rem";
    commitLabel.style.fontSize = "1rem";
    commitDiv.appendChild(commitLabel);

    const commitComponent = document.createElement(
      "sketch-workflow-status-summary",
    ) as SketchWorkflowStatusSummary;
    commitComponent.messages = mockMessages;
    commitComponent.commit = "def456";
    commitDiv.appendChild(commitComponent);
    filterSection.appendChild(commitDiv);

    section.appendChild(filterSection);

    // Add integration examples
    const integrationSection = document.createElement("div");
    integrationSection.style.marginTop = "3rem";
    integrationSection.style.border = "1px solid #0066cc";
    integrationSection.style.borderRadius = "8px";
    integrationSection.style.padding = "1.5rem";
    integrationSection.style.backgroundColor = "#f0f8ff";

    const integrationHeader = document.createElement("h3");
    integrationHeader.textContent = "Timeline Integration Mockup";
    integrationHeader.style.marginTop = "0";
    integrationHeader.style.marginBottom = "1rem";
    integrationHeader.style.color = "var(--demo-fixture-text-color)";
    integrationSection.appendChild(integrationHeader);

    const integrationDesc = document.createElement("p");
    integrationDesc.textContent =
      "How it might look integrated into the timeline, showing workflows alongside commit info:";
    integrationDesc.style.marginBottom = "1.5rem";
    integrationDesc.style.fontSize = "0.9rem";
    integrationDesc.style.fontStyle = "italic";
    integrationSection.appendChild(integrationDesc);

    // Mock timeline entry with commit + workflow status
    const timelineEntry = document.createElement("div");
    timelineEntry.style.border = "1px solid #ddd";
    timelineEntry.style.borderRadius = "8px";
    timelineEntry.style.padding = "1rem";
    timelineEntry.style.backgroundColor = "white";
    timelineEntry.style.marginBottom = "1rem";

    // Mock commit info
    const commitInfo = document.createElement("div");
    commitInfo.style.marginBottom = "1rem";
    commitInfo.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <span style="font-family: monospace; background: #e5e7eb; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">abc123d</span>
        <span style="font-weight: 500;">Implement new workflow status UI</span>
      </div>
      <div style="font-size: 0.8rem; color: #666;">Pushed to main branch</div>
    `;
    timelineEntry.appendChild(commitInfo);

    // Add workflow status
    const workflowStatus = document.createElement(
      "sketch-workflow-status-summary",
    ) as SketchWorkflowStatusSummary;
    workflowStatus.messages = mockMessages.filter(
      (m) =>
        m.external_message?.body?.workflow_run?.head_branch === "main" &&
        m.external_message?.body?.workflow_run?.head_sha ===
          "abc123deadbeef1234567890abcdef",
    );
    timelineEntry.appendChild(workflowStatus);

    integrationSection.appendChild(timelineEntry);
    section.appendChild(integrationSection);

    container.appendChild(section);
  },
};

export default demo;
