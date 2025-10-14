import { test, expect } from "@sand4rt/experimental-ct-web";
import { SketchCallStatus } from "./sketch-call-status";

test("is hidden when not disconnected by default", async ({ mount }) => {
  const component = await mount(SketchCallStatus, {});

  // Check that the component is hidden when not disconnected
  // The component should render a hidden div
  await expect(component.locator("div[style*='display: none']")).toBeAttached();
  await expect(component.locator(".status-banner")).not.toBeVisible();
});

test("is hidden when explicitly not disconnected", async ({ mount }) => {
  const component = await mount(SketchCallStatus, {
    props: {
      isDisconnected: false,
    },
  });

  // Check that the component is hidden when not disconnected
  // The component should render a hidden div
  await expect(component.locator("div[style*='display: none']")).toBeAttached();
  await expect(component.locator(".status-banner")).not.toBeVisible();
});

test("displays DISCONNECTED status when isDisconnected is true", async ({
  mount,
}) => {
  const component = await mount(SketchCallStatus, {
    props: {
      isDisconnected: true,
    },
  });

  // Check that the status banner is visible and has the correct text
  await expect(component.locator(".status-banner")).toBeVisible();
  await expect(component.locator(".status-banner")).toHaveText("DISCONNECTED");

  // Check that it has the correct classes for styling
  await expect(component.locator(".status-banner")).toHaveClass(
    /bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400/,
  );

  // Check tooltip
  await expect(component.locator(".status-banner")).toHaveAttribute(
    "title",
    "Connection lost or container shut down",
  );

  // Ensure the hidden div is not present
  await expect(
    component.locator("div[style*='display: none']"),
  ).not.toBeVisible();
});
