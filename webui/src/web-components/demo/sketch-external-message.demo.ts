import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";
import { SketchExternalMessage } from "../sketch-external-message";

const demo: DemoModule = {
  title: "Sketch External Message Demo",
  description:
    "Demonstration of external message components for various external message types",
  imports: ["../sketch-external-message.ts"],

  setup: async (container: HTMLElement) => {
    const section = demoUtils.createDemoSection(
      "External Message Components",
      "Shows different external message components for various message types",
    );

    // external messages
    const externalMessages = [
      {
        name: "github_workflow_run: completed, success",
        message_type: "github_workflow_run",
        body: {
          workflow: {
            name: "go_tests",
          },
          workflow_run: {
            id: 123456789,
            status: "completed",
            conclusion: "success",
            head_branch: "user/sketch/slug-name",
            head_sha: "abc123deadbeef1234567890abcdef",
            html_url: "https://github.com/orgs/your-org/actions/runs/123456789",
          },
        },
      },
      {
        name: "github_workflow_run: completed, failed",
        message_type: "github_workflow_run",
        body: {
          workflow: {
            name: "go_tests",
          },
          workflow_run: {
            id: 123456789,
            status: "completed",
            conclusion: "failure",
            head_branch: "user/sketch/slug-name",
            head_sha: "abc123deadbeef1234567890abcdef",
            html_url: "https://github.com/orgs/your-org/actions/runs/123456789",
          },
        },
      },
      {
        name: "github_workflow_run: queued",
        message_type: "github_workflow_run",
        body: {
          workflow: {
            name: "go_tests",
          },
          workflow_run: {
            id: 123456789,
            status: "queued",
            head_branch: "user/sketch/slug-name",
            head_sha: "abc123deadbeef1234567890abcdef",
            html_url: "https://github.com/orgs/your-org/actions/runs/123456789",
          },
        },
      },
      {
        name: "github_workflow_run: in_progress",
        message_type: "github_workflow_run",
        body: {
          workflow: {
            name: "go_tests",
          },
          workflow_run: {
            id: 123456789,
            status: "in_progress",
            head_branch: "user/sketch/slug-name",
            head_sha: "abc123deadbeef1234567890abcdef",
            html_url: "https://github.com/orgs/your-org/actions/runs/123456789",
          },
        },
      },
    ];

    // Create tool cards for each tool call
    externalMessages.forEach((msg) => {
      const msgSection = document.createElement("div");
      msgSection.style.marginBottom = "2rem";
      msgSection.style.border = "1px solid #eee";
      msgSection.style.borderRadius = "8px";
      msgSection.style.padding = "1rem";

      const header = document.createElement("h3");
      header.textContent = `Message: ${msg.name}`;
      header.style.marginTop = "0";
      header.style.marginBottom = "1rem";
      header.style.color = "var(--demo-fixture-text-color)";
      msgSection.appendChild(header);
      const msgEl = document.createElement(
        "sketch-external-message",
      ) as SketchExternalMessage;

      msgEl.message = {
        message_type: msg.message_type,
        body: msg.body,
        text_content: `Workflow run ${msg.body.workflow_run.id} completed with status ${msg.body.workflow_run.status} and conclusion ${msg.body.workflow_run.conclusion}.`,
      };
      msgEl.open = true;

      msgSection.appendChild(msgEl);
      section.appendChild(msgSection);
    });

    container.appendChild(section);
  },
};

export default demo;
