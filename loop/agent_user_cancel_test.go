//go:build goexperiment.synctest

package loop

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"testing/synctest"

	"github.com/spinility/sketch-neomxm/llm"
	"github.com/spinility/sketch-neomxm/llm/conversation"
)

func TestLoop_OneTurn_Basic(t *testing.T) {
	synctest.Run(func() {
		mockConvo := NewMockConvo(t)

		agent := &Agent{
			convo: mockConvo,
			inbox: make(chan string, 1),
		}
		agent.stateMachine = NewStateMachine()
		userMsg := llm.UserStringMessage("hi")
		userMsgResponse := &llm.Response{}
		mockConvo.ExpectCall("SendMessage", userMsg).Return(userMsgResponse, nil)

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		go agent.Loop(ctx)

		agent.UserMessage(ctx, "hi")

		// This makes sure the SendMessage call happens before we assert the expectations.
		synctest.Wait()

		// Verify results
		mockConvo.AssertExpectations(t)
	})
}

func TestLoop_ToolCall_Basic(t *testing.T) {
	synctest.Run(func() {
		mockConvo := NewMockConvo(t)

		agent := &Agent{
			convo: mockConvo,
			inbox: make(chan string, 1),
		}
		agent.stateMachine = NewStateMachine()
		userMsg := llm.Message{
			Role: llm.MessageRoleUser,
			Content: []llm.Content{
				{Type: llm.ContentTypeText, Text: "hi"},
			},
		}
		userMsgResponse := &llm.Response{
			StopReason: llm.StopReasonToolUse,
			Content: []llm.Content{
				{
					Type:      llm.ContentTypeToolUse,
					ID:        "tool1",
					ToolName:  "test_tool",
					ToolInput: []byte(`{"param":"value"}`),
				},
			},
			Usage: llm.Usage{
				InputTokens:  100,
				OutputTokens: 200,
			},
		}

		toolUseContents := []llm.Content{
			{
				Type:      llm.ContentTypeToolResult,
				ToolUseID: "tool1",
				Text:      "",
				ToolResult: []llm.Content{{
					Type: llm.ContentTypeText,
					Text: "This is a tool result",
				}},
				ToolError: false,
			},
		}
		toolUseResultsMsg := llm.Message{
			Role:    llm.MessageRoleUser,
			Content: toolUseContents,
		}
		toolUseResponse := &llm.Response{
			StopReason: llm.StopReasonEndTurn,
			Content: []llm.Content{
				{
					Type: llm.ContentTypeText,
					Text: "tool_use contents accepted",
				},
			},
			Usage: llm.Usage{
				InputTokens:  50,
				OutputTokens: 75,
			},
		}

		// Set up the mock response for tool results
		mockConvo.ExpectCall("SendMessage", userMsg).Return(userMsgResponse, nil)
		mockConvo.ExpectCall("ToolResultContents", userMsgResponse).Return(toolUseContents, false, nil)
		mockConvo.ExpectCall("SendMessage", toolUseResultsMsg).Return(toolUseResponse, nil)

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		go agent.Loop(ctx)

		agent.UserMessage(ctx, "hi")

		// This makes sure the SendMessage call happens before we assert the expectations.
		synctest.Wait()

		// Verify results
		mockConvo.AssertExpectations(t)
	})
}

func TestLoop_ToolCall_UserCancelsDuringToolResultContents(t *testing.T) {
	synctest.Run(func() {
		mockConvo := NewMockConvo(t)

		agent := &Agent{
			convo: mockConvo,
			inbox: make(chan string, 1),
		}
		agent.stateMachine = NewStateMachine()
		userMsg := llm.UserStringMessage("hi")
		userMsgResponse := &llm.Response{
			StopReason: llm.StopReasonToolUse,
			Content: []llm.Content{
				{
					Type:      llm.ContentTypeToolUse,
					ID:        "tool1",
					ToolName:  "test_tool",
					ToolInput: []byte(`{"param":"value"}`),
				},
			},
			Usage: llm.Usage{
				InputTokens:  100,
				OutputTokens: 200,
			},
		}
		toolUseResultsMsg := llm.UserStringMessage(cancelToolUseMessage)
		toolUseResponse := &llm.Response{
			StopReason: llm.StopReasonEndTurn,
			Content: []llm.Content{
				{
					Type: llm.ContentTypeText,
					Text: "tool_use contents accepted",
				},
			},
			Usage: llm.Usage{
				InputTokens:  50,
				OutputTokens: 75,
			},
		}

		// Set up the mock response for tool results

		userCancelError := fmt.Errorf("user canceled")
		// This allows the test to block the InnerLoop goroutine that invokes ToolResultsContents so
		// we can force its context to cancel while it's blocked.
		waitForToolResultContents := make(chan any, 1)

		mockConvo.ExpectCall("SendMessage", userMsg).Return(userMsgResponse, nil)
		mockConvo.ExpectCall("ToolResultContents",
			userMsgResponse).BlockAndReturn(waitForToolResultContents, []llm.Content{}, userCancelError)
		mockConvo.ExpectCall("SendMessage", toolUseResultsMsg).Return(toolUseResponse, nil)

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		go agent.Loop(ctx)

		// This puts one message into agent.inbox, which should un-block the GatherMessages call
		// at the top of agent.InnerLoop.
		agent.UserMessage(ctx, "hi")

		// This makes sure the first SendMessage call happens before we proceed with the cancel.
		synctest.Wait()

		// The goroutine executing ToolResultContents call should be blocked, simulating a long
		// running operation that the user wishes to cancel while it's still in progress.
		// This call invokes that InnerLoop context's cancel() func.
		agent.CancelTurn(userCancelError)

		// This tells the goroutine that's in mockConvo.ToolResultContents to proceed.
		waitForToolResultContents <- nil

		// This makes sure the final SendMessage call happens before we assert the expectations.
		synctest.Wait()

		// Verify results
		mockConvo.AssertExpectations(t)
	})
}

func TestLoop_ToolCall_UserCancelsDuringToolResultContents_AndContinuesToChat(t *testing.T) {
	synctest.Run(func() {
		mockConvo := NewMockConvo(t)

		agent := &Agent{
			convo: mockConvo,
			inbox: make(chan string, 1),
		}
		agent.stateMachine = NewStateMachine()
		userMsg := llm.Message{
			Role: llm.MessageRoleUser,
			Content: []llm.Content{
				{Type: llm.ContentTypeText, Text: "hi"},
			},
		}
		userMsgResponse := &llm.Response{
			StopReason: llm.StopReasonToolUse,
			Content: []llm.Content{
				{
					Type:      llm.ContentTypeToolUse,
					ID:        "tool1",
					ToolName:  "test_tool",
					ToolInput: []byte(`{"param":"value"}`),
				},
			},
			Usage: llm.Usage{
				InputTokens:  100,
				OutputTokens: 200,
			},
		}
		toolUseResultsMsg := llm.Message{
			Role: llm.MessageRoleUser,
			Content: []llm.Content{
				{Type: llm.ContentTypeText, Text: cancelToolUseMessage},
			},
		}
		toolUseResultResponse := &llm.Response{
			StopReason: llm.StopReasonEndTurn,
			Content: []llm.Content{
				{
					Type: llm.ContentTypeText,
					Text: "awaiting further instructions",
				},
			},
			Usage: llm.Usage{
				InputTokens:  50,
				OutputTokens: 75,
			},
		}
		userFollowUpMsg := llm.Message{
			Role: llm.MessageRoleUser,
			Content: []llm.Content{
				{Type: llm.ContentTypeText, Text: "that was the wrong thing to do"},
			},
		}
		userFollowUpResponse := &llm.Response{
			StopReason: llm.StopReasonEndTurn,
			Content: []llm.Content{
				{
					Type: llm.ContentTypeText,
					Text: "sorry about that",
				},
			},
			Usage: llm.Usage{
				InputTokens:  100,
				OutputTokens: 200,
			},
		}
		// Set up the mock response for tool results

		userCancelError := fmt.Errorf("user canceled")
		// This allows the test to block the InnerLoop goroutine that invokes ToolResultsContents so
		// we can force its context to cancel while it's blocked.
		waitForToolResultContents := make(chan any, 1)

		mockConvo.ExpectCall("SendMessage", userMsg).Return(userMsgResponse, nil)
		mockConvo.ExpectCall("ToolResultContents",
			userMsgResponse).BlockAndReturn(waitForToolResultContents, []llm.Content{}, userCancelError)
		mockConvo.ExpectCall("SendMessage", toolUseResultsMsg).Return(toolUseResultResponse, nil)

		mockConvo.ExpectCall("SendMessage", userFollowUpMsg).Return(userFollowUpResponse, nil)

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		go agent.Loop(ctx)

		// This puts one message into agent.inbox, which should un-block the GatherMessages call
		// at the top of agent.InnerLoop.
		agent.UserMessage(ctx, "hi")

		// This makes sure the first SendMessage call happens before we proceed with the cancel.
		synctest.Wait()

		// The goroutine executing ToolResultContents call should be blocked, simulating a long
		// running operation that the user wishes to cancel while it's still in progress.
		// This call invokes that InnerLoop context's cancel() func.
		agent.CancelTurn(userCancelError)

		// This tells the goroutine that's in mockConvo.ToolResultContents to proceed.
		waitForToolResultContents <- nil

		// Allow InnerLoop to handle the cancellation logic before continuing the conversation.
		synctest.Wait()

		agent.UserMessage(ctx, "that was the wrong thing to do")

		synctest.Wait()

		// Verify results
		mockConvo.AssertExpectations(t)
	})
}

func TestProcessTurn_UserCancels(t *testing.T) {
	synctest.Run(func() {
		mockConvo := NewMockConvo(t)

		agent := &Agent{
			convo: mockConvo,
			inbox: make(chan string, 1),
		}
		agent.stateMachine = NewStateMachine()

		// Define test message
		// This simulates something that would result in claude  responding with tool_use responses.
		userMsg := llm.UserStringMessage("use test_tool for something")
		// Mock initial response with tool use
		userMsgResponse := &llm.Response{
			StopReason: llm.StopReasonToolUse,
			Content: []llm.Content{
				{
					Type:      llm.ContentTypeToolUse,
					ID:        "tool1",
					ToolName:  "test_tool",
					ToolInput: []byte(`{"param":"value"}`),
				},
			},
			Usage: llm.Usage{
				InputTokens:  100,
				OutputTokens: 200,
			},
		}
		canceledToolUseContents := []llm.Content{
			{
				Type:      llm.ContentTypeToolResult,
				ToolUseID: "tool1",
				ToolError: true,
				ToolResult: []llm.Content{{
					Type: llm.ContentTypeText,
					Text: "user canceled this tool_use",
				}},
			},
		}
		canceledToolUseMsg := llm.Message{
			Role:    llm.MessageRoleUser,
			Content: append(canceledToolUseContents, llm.StringContent(cancelToolUseMessage)),
		}
		// Set up expected behaviors
		waitForSendMessage := make(chan any)
		mockConvo.ExpectCall("SendMessage", userMsg).BlockAndReturn(waitForSendMessage, userMsgResponse, nil)

		mockConvo.ExpectCall("ToolResultCancelContents", userMsgResponse).Return(canceledToolUseContents, nil)
		mockConvo.ExpectCall("SendMessage", canceledToolUseMsg).Return(
			&llm.Response{
				StopReason: llm.StopReasonToolUse,
			}, nil)

		ctx, cancel := context.WithCancelCause(context.Background())

		// Run one iteration of the processing loop
		go agent.processTurn(ctx)

		// Send a message to the agent's inbox
		agent.UserMessage(ctx, "use test_tool for something")

		synctest.Wait()

		// cancel the context before we even call InnerLoop with it, so it will
		// be .Done() the first time it checks.
		cancel(fmt.Errorf("user canceled"))

		// unblock the InnerLoop goroutine's SendMessage call
		waitForSendMessage <- nil

		synctest.Wait()

		// Verify results
		mockConvo.AssertExpectations(t)
	})
}

func TestProcessTurn_UserDoesNotCancel(t *testing.T) {
	mockConvo := NewMockConvo(t)

	agent := &Agent{
		convo: mockConvo,
		inbox: make(chan string, 100),
	}
	agent.stateMachine = NewStateMachine()

	// Define test message
	// This simulates something that would result in claude
	// responding with tool_use responses.
	testMsg := "use test_tool for something"

	// Mock initial response with tool use
	initialResponse := &llm.Response{
		StopReason: llm.StopReasonToolUse,
		Content: []llm.Content{
			{
				Type:      llm.ContentTypeToolUse,
				ID:        "tool1",
				ToolName:  "test_tool",
				ToolInput: []byte(`{"param":"value"}`),
			},
		},
		Usage: llm.Usage{
			InputTokens:  100,
			OutputTokens: 200,
		},
	}

	// Set up expected behaviors
	mockConvo.ExpectCall("SendMessage", nil).Return(initialResponse, nil)

	toolUseContents := []llm.Content{
		{
			Type:      llm.ContentTypeToolResult,
			ToolUseID: "tool1",
			Text:      "",
			ToolResult: []llm.Content{{
				Type: llm.ContentTypeText,
				Text: "This is a tool result",
			}},
			ToolError: false,
		},
	}
	toolUseResponse := &llm.Response{
		// StopReason: llm.StopReasonEndTurn,
		Content: []llm.Content{
			{
				Type: llm.ContentTypeText,
				Text: "tool_use contents accepted",
			},
		},
		Usage: llm.Usage{
			InputTokens:  50,
			OutputTokens: 75,
		},
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Setting up the mock response for tool results
	mockConvo.ExpectCall("ToolResultContents", initialResponse).Return(toolUseContents, false, nil)
	mockConvo.ExpectCall("SendMessage", nil).Return(toolUseResponse, nil)
	// mockConvo, as a mock, isn't able to run the loop in conversation.Convo that makes this agent.OnToolResult callback.
	// So we "mock" it out here by calling it explicitly, in order to make sure it calls .pushToOutbox with this message.
	// This is not a good situation.
	// conversation.Convo and loop.Agent seem to be excessively coupled, and aware of each others' internal details.
	// TODO: refactor (or clarify in docs somewhere) the boundary between what conversation.Convo is responsible
	// for vs what loop.Agent is responsible for.
	antConvo := &conversation.Convo{}
	res := ""
	agent.OnToolResult(ctx, antConvo, "tool1", "test_tool", json.RawMessage(`{"param":"value"}`), toolUseContents[0], &res, nil)

	// Send a message to the agent's inbox
	agent.UserMessage(ctx, testMsg)

	// Run one iteration of the processing loop
	agent.processTurn(ctx)

	// Verify results
	mockConvo.AssertExpectations(t)
}
