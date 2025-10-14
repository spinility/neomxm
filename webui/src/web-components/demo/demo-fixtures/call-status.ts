/**
 * Shared fake call status data for demos
 */

export interface CallStatusState {
  llmCalls: number;
  toolCalls: string[];
  agentState: string | null;
  isIdle: boolean;
  isDisconnected: boolean;
}

export const idleCallStatus: CallStatusState = {
  llmCalls: 0,
  toolCalls: [],
  agentState: null,
  isIdle: true,
  isDisconnected: false,
};

export const workingCallStatus: CallStatusState = {
  llmCalls: 1,
  toolCalls: ["patch", "bash"],
  agentState: "analyzing code",
  isIdle: false,
  isDisconnected: false,
};

export const heavyWorkingCallStatus: CallStatusState = {
  llmCalls: 3,
  toolCalls: ["keyword_search", "patch", "bash", "think", "codereview"],
  agentState: "refactoring components",
  isIdle: false,
  isDisconnected: false,
};

export const disconnectedCallStatus: CallStatusState = {
  llmCalls: 0,
  toolCalls: [],
  agentState: null,
  isIdle: true,
  isDisconnected: true,
};

export const workingDisconnectedCallStatus: CallStatusState = {
  llmCalls: 2,
  toolCalls: ["browser_navigate", "patch"],
  agentState: "testing changes",
  isIdle: false,
  isDisconnected: true,
};
