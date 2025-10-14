import { test, expect } from "@sand4rt/experimental-ct-web";
import { SketchViewModeSelect } from "./sketch-view-mode-select";

test("initializes with 'chat' as the default mode", async ({ mount }) => {
  const component = await mount(SketchViewModeSelect, {});

  // Check the activeMode property
  const activeMode = await component.evaluate(
    (el: SketchViewModeSelect) => el.activeMode,
  );
  expect(activeMode).toBe("chat");

  // Check that the chat button has the active styling (dark blue border indicates active)
  await expect(component.locator("#showConversationButton")).toHaveClass(
    /border-b-blue-600/,
  );
});

test("dispatches view-mode-select event when clicking a mode button", async ({
  mount,
}) => {
  const component = await mount(SketchViewModeSelect, {});

  // Set up promise to wait for the event
  const eventPromise = component.evaluate((el) => {
    return new Promise((resolve) => {
      el.addEventListener(
        "view-mode-select",
        (event) => {
          resolve((event as CustomEvent).detail);
        },
        { once: true },
      );
    });
  });

  // Click the diff button
  await component.locator("#showDiff2Button").click();

  // Wait for the event and check its details
  const detail: any = await eventPromise;
  expect(detail.mode).toBe("diff2");
});

test("updates the active mode when receiving update-active-mode event", async ({
  mount,
}) => {
  const component = await mount(SketchViewModeSelect, {});

  // Initially should be in chat mode
  let activeMode = await component.evaluate(
    (el: SketchViewModeSelect) => el.activeMode,
  );
  expect(activeMode).toBe("chat");

  // Dispatch the update-active-mode event
  await component.evaluate((el) => {
    const updateEvent = new CustomEvent("update-active-mode", {
      detail: { mode: "diff2" },
      bubbles: true,
    });
    el.dispatchEvent(updateEvent);
  });

  // Check that the mode was updated
  activeMode = await component.evaluate(
    (el: SketchViewModeSelect) => el.activeMode,
  );
  expect(activeMode).toBe("diff2");

  // Check that the diff button is now active (has dark blue border)
  await expect(component.locator("#showDiff2Button")).toHaveClass(
    /border-b-blue-600/,
  );
});

test("correctly marks the active button based on mode", async ({ mount }) => {
  const component = await mount(SketchViewModeSelect, {
    props: {
      activeMode: "terminal",
    },
  });

  // Terminal button should be active (has dark blue border)
  await expect(component.locator("#showTerminalButton")).toHaveClass(
    /border-b-blue-600/,
  );

  // Other buttons should not be active (should not have dark blue border)
  await expect(component.locator("#showConversationButton")).not.toHaveClass(
    /border-b-blue-600/,
  );
  await expect(component.locator("#showDiff2Button")).not.toHaveClass(
    /border-b-blue-600/,
  );
});
