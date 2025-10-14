import { AgentMessage } from "../types";

export function aggregateAgentMessages(
  arr1: AgentMessage[],
  arr2: AgentMessage[],
): AgentMessage[] {
  const mergedArray = [...arr1, ...arr2];
  const seenIds = new Set<number>();
  const toolCallResults = new Map<string, AgentMessage>();

  const ret: AgentMessage[] = mergedArray
    .filter((msg) => {
      if (msg.type == "tool") {
        toolCallResults.set(msg.tool_call_id, msg);
        return false;
      }
      // Suppress internal message types that shouldn't be displayed
      if (msg.type == "slug" || msg.type == "compact") {
        return false;
      }
      // Filter out messages with empty/missing content unless they have tool_calls, commits or
      // external messsages.
      const hasContent = msg.content && msg.content.trim().length > 0;
      const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
      const hasCommits = msg.commits && msg.commits.length > 0;
      const hasExtneral = msg.external_message ? true : false;

      if (!hasContent && !hasToolCalls && !hasCommits && !hasExtneral) {
        return false;
      }
      if (seenIds.has(msg.idx)) {
        return false; // Skip if idx is already seen
      }

      seenIds.add(msg.idx);
      return true;
    })
    .sort((a: AgentMessage, b: AgentMessage) => a.idx - b.idx);

  // Attach any tool_call result messages to the original message's tool_call object.
  ret.forEach((msg) => {
    msg.tool_calls?.forEach((toolCall) => {
      if (toolCallResults.has(toolCall.tool_call_id)) {
        toolCall.result_message = toolCallResults.get(toolCall.tool_call_id);
      }
    });
  });
  return ret;
}
