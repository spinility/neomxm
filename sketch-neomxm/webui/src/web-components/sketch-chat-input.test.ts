import { test, expect } from "@sand4rt/experimental-ct-web";
import { SketchChatInput } from "./sketch-chat-input";

test("initializes with empty content by default", async ({ mount }) => {
  const component = await mount(SketchChatInput, {});

  // Check public property via component's evaluate method
  const content = await component.evaluate((el: SketchChatInput) => el.content);
  expect(content).toBe("");

  // Check textarea value
  await expect(component.locator("#chatInput")).toHaveValue("");
});

test("initializes with provided content", async ({ mount }) => {
  const testContent = "Hello, world!";
  const component = await mount(SketchChatInput, {
    props: {
      content: testContent,
    },
  });

  // Check public property via component's evaluate method
  const content = await component.evaluate((el: SketchChatInput) => el.content);
  expect(content).toBe(testContent);

  // Check textarea value
  await expect(component.locator("#chatInput")).toHaveValue(testContent);
});

test("updates content when typing in the textarea", async ({ mount }) => {
  const component = await mount(SketchChatInput, {});
  const newValue = "New message";

  // Fill the textarea with new content
  await component.locator("#chatInput").fill(newValue);

  // Check that the content property was updated
  const content = await component.evaluate((el: SketchChatInput) => el.content);
  expect(content).toBe(newValue);
});

test("sends message when clicking the send button", async ({ mount }) => {
  const testContent = "Test message";
  const component = await mount(SketchChatInput, {
    props: {
      content: testContent,
    },
  });

  // Set up promise to wait for the event
  const eventPromise = component.evaluate((el) => {
    return new Promise((resolve) => {
      el.addEventListener(
        "send-chat",
        (event) => {
          resolve((event as CustomEvent).detail);
        },
        { once: true },
      );
    });
  });

  // Click the send button
  await component.locator("#sendChatButton").click();

  // Wait for the event and check its details
  const detail: any = await eventPromise;
  expect(detail.message).toBe(testContent);
});

test.skip("sends message when pressing Enter (without shift)", async ({
  mount,
}) => {
  const testContent = "Test message";
  const component = await mount(SketchChatInput, {
    props: {
      content: testContent,
    },
  });

  // Set up promise to wait for the event
  const eventPromise = component.evaluate((el) => {
    return new Promise((resolve) => {
      el.addEventListener(
        "send-chat",
        (event) => {
          resolve((event as CustomEvent).detail);
        },
        { once: true },
      );
    });
  });

  // Press Enter in the textarea
  await component.locator("#chatInput").press("Enter");

  // Wait for the event and check its details
  const detail: any = await eventPromise;
  expect(detail.message).toBe(testContent);

  // Check that content was cleared
  const content = await component.evaluate((el: SketchChatInput) => el.content);
  expect(content).toBe("");
});

test.skip("does not send message when pressing Shift+Enter", async ({
  mount,
}) => {
  const testContent = "Test message";
  const component = await mount(SketchChatInput, {
    props: {
      content: testContent,
    },
  });

  // Set up to track if event fires
  let eventFired = false;
  await component.evaluate((el) => {
    el.addEventListener("send-chat", () => {
      (window as any).__eventFired = true;
    });
    (window as any).__eventFired = false;
  });

  // Press Shift+Enter in the textarea
  await component.locator("#chatInput").press("Shift+Enter");

  // Wait a short time and check if event fired
  await new Promise((resolve) => setTimeout(resolve, 50));
  eventFired = await component.evaluate(() => (window as any).__eventFired);
  expect(eventFired).toBe(false);

  // Check that content was not cleared
  const content = await component.evaluate((el: SketchChatInput) => el.content);
  expect(content).toBe(testContent);
});

test("resizes when user enters more text than will fit", async ({ mount }) => {
  const testContent = "Test message\n\n\n\n\n\n\n\n\n\n\n\n\nends here.";
  const component = await mount(SketchChatInput, {
    props: {
      content: "",
    },
  });
  const origHeight = await component.evaluate(
    (el: SketchChatInput) => el.chatInput.style.height,
  );

  // Enter very tall text in the textarea
  await component.locator("#chatInput").fill(testContent);

  // Wait for the requestAnimationFrame to complete
  await component.evaluate(() => new Promise(requestAnimationFrame));

  // Check that textarea resized
  const newHeight = await component.evaluate(
    (el: SketchChatInput) => el.chatInput.style.height,
  );
  expect(Number.parseInt(newHeight)).toBeGreaterThan(
    Number.parseInt(origHeight),
  );
});

test("shows drop overlay when file is dragged over", async ({ mount }) => {
  const component = await mount(SketchChatInput, {});

  // Simulate dragenter event
  await component.evaluate((el: SketchChatInput) => {
    const container = el.querySelector(".chat-container");
    if (container) {
      const event = new DragEvent("dragenter", { bubbles: true });
      container.dispatchEvent(event);
    }
  });

  // Check that the isDraggingOver state is true
  const isDraggingOver = await component.evaluate(
    (el: SketchChatInput) => el.isDraggingOver,
  );
  expect(isDraggingOver).toBe(true);

  // Check that the drop zone overlay is visible
  const overlay = await component.evaluate(
    (el: SketchChatInput) => el.querySelector(".drop-zone-overlay") !== null,
  );
  expect(overlay).toBe(true);
});

test("hides drop overlay when drag leaves", async ({ mount }) => {
  const component = await mount(SketchChatInput, {});

  // First set isDraggingOver to true
  await component.evaluate((el: SketchChatInput) => {
    el.isDraggingOver = true;
  });

  // Simulate dragleave event
  await component.evaluate((el: SketchChatInput) => {
    const container = el.querySelector(".chat-container");
    if (container) {
      const event = new DragEvent("dragleave", { bubbles: true });
      Object.defineProperty(event, "target", { value: container });
      container.dispatchEvent(event);
    }
  });

  // Check that the isDraggingOver state is false
  const isDraggingOver = await component.evaluate(
    (el: SketchChatInput) => el.isDraggingOver,
  );
  expect(isDraggingOver).toBe(false);
});

// Note: Testing actual file drop and upload would require mocking the fetch API
// This is a simple test that the drop event handler exists
test("has a drop event handler", async ({ mount }) => {
  const component = await mount(SketchChatInput, {});

  // Check that the component has the _handleDrop method
  const hasDropHandler = await component.evaluate(
    (el: SketchChatInput) => typeof (el as any)._handleDrop === "function",
  );
  expect(hasDropHandler).toBe(true);
});

test("disables textarea and button when isDisconnected is true", async ({
  mount,
}) => {
  const component = await mount(SketchChatInput, {
    props: {
      isDisconnected: true,
    },
  });

  // Check that textarea is disabled
  await expect(component.locator("#chatInput")).toBeDisabled();

  // Check that send button is disabled
  await expect(component.locator("#sendChatButton")).toBeDisabled();

  // Check that placeholder text indicates disconnected state
  await expect(component.locator("#chatInput")).toHaveAttribute(
    "placeholder",
    "Chat is disabled while disconnected...",
  );

  // Check that button text shows "Disconnected"
  await expect(component.locator("#sendChatButton")).toHaveText("Disconnected");
});

test("enables textarea and button when isDisconnected is false", async ({
  mount,
}) => {
  const component = await mount(SketchChatInput, {
    props: {
      isDisconnected: false,
    },
  });

  // Check that textarea is not disabled
  await expect(component.locator("#chatInput")).not.toBeDisabled();

  // Check that send button is not disabled
  await expect(component.locator("#sendChatButton")).not.toBeDisabled();

  // Check that placeholder text is normal
  await expect(component.locator("#chatInput")).toHaveAttribute(
    "placeholder",
    "Type your message here and press Enter to send...",
  );

  // Check that button text shows "Send"
  await expect(component.locator("#sendChatButton")).toHaveText("Send");
});

test("does not send message when disconnected", async ({ mount }) => {
  const testContent = "Test message";
  const component = await mount(SketchChatInput, {
    props: {
      content: testContent,
      isDisconnected: true,
    },
  });

  // Set up to track if event fires
  let eventFired = false;
  await component.evaluate((el) => {
    el.addEventListener("send-chat", () => {
      (window as any).__eventFired = true;
    });
    (window as any).__eventFired = false;
  });

  // Try to click the send button (should be disabled but let's test)
  await component.locator("#sendChatButton").click({ force: true });

  // Wait a short time and check if event fired
  await new Promise((resolve) => setTimeout(resolve, 50));
  eventFired = await component.evaluate(() => (window as any).__eventFired);
  expect(eventFired).toBe(false);

  // Check that content was not cleared
  const content = await component.evaluate((el: SketchChatInput) => el.content);
  expect(content).toBe(testContent);
});

test("prioritizes disconnected state over upload state", async ({ mount }) => {
  const component = await mount(SketchChatInput, {
    props: {
      isDisconnected: true,
    },
  });

  // Simulate uploads in progress
  await component.evaluate((el: SketchChatInput) => {
    el.uploadsInProgress = 2;
  });

  // Check that button still shows "Disconnected" not "Uploading..."
  await expect(component.locator("#sendChatButton")).toHaveText("Disconnected");

  // Check that both textarea and button are still disabled
  await expect(component.locator("#chatInput")).toBeDisabled();
  await expect(component.locator("#sendChatButton")).toBeDisabled();
});
