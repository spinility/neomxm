/**
 * Shared fake tool call data for demos
 */

import { ToolCall } from "../../../types";

export const sampleToolCalls: ToolCall[] = [
  {
    name: "bash",
    input: JSON.stringify({
      command:
        "docker ps -a --format '{{.ID}} {{.Image }} {{.Names}}' | grep sketch | awk '{print $1 }' | xargs -I {} docker rm {} && docker image prune -af",
    }),
    tool_call_id: "toolu_01bash123",
    result: "Removed containers and pruned images",
  },
  {
    name: "patch",
    input: JSON.stringify({
      path: "/app/src/components/Button.tsx",
      patches: [
        {
          operation: "replace",
          oldText: "className='btn'",
          newText: "className='btn btn-primary'",
        },
      ],
    }),
    tool_call_id: "toolu_01patch123",
    result: "Applied patch successfully",
  },
  {
    name: "think",
    input: JSON.stringify({
      thoughts:
        "I need to analyze the user's requirements and break this down into smaller steps. The user wants to implement a file upload feature with drag-and-drop support.",
    }),
    tool_call_id: "toolu_01think123",
    result: "Recorded thoughts for planning",
  },
];

export const longBashCommand: ToolCall = {
  name: "bash",
  input: JSON.stringify({
    command:
      'git commit --allow-empty -m "chore: create empty commit with very long message\n\nThis is an extremely long commit message to demonstrate how Git handles verbose commit messages.\nThis empty commit has no actual code changes, but contains a lengthy explanation.\n\nThe empty commit pattern can be useful in several scenarios:\n1. Triggering CI/CD pipelines without modifying code\n2. Marking significant project milestones or releases\n3. Creating annotated reference points in the commit history\n4. Documenting important project decisions"',
  }),
  tool_call_id: "toolu_01longbash",
  result:
    "[main abc1234] chore: create empty commit with very long message\n\ncommit created successfully",
};

export const multipleToolCallGroups = [
  [sampleToolCalls[0], sampleToolCalls[1]], // Multiple choice examples
  [sampleToolCalls[2]], // Single bash command
  [sampleToolCalls[3], sampleToolCalls[4]], // Patch and think
  [longBashCommand], // Long command example
];
