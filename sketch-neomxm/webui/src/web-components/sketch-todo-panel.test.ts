import { test, expect } from "@sand4rt/experimental-ct-web";
import { SketchTodoPanel } from "./sketch-todo-panel";
import { TodoItem } from "../types";

// Helper function to create mock todo items
function createMockTodoItem(props: Partial<TodoItem> = {}): TodoItem {
  return {
    id: props.id || "task-1",
    status: props.status || "queued",
    task: props.task || "Sample task description",
    ...props,
  };
}

test("initializes with default properties", async ({ mount }) => {
  const component = await mount(SketchTodoPanel, {});

  // Check default properties
  const visible = await component.evaluate((el: SketchTodoPanel) => el.visible);
  expect(visible).toBe(false);

  // When not visible, component should not render content
  const content = await component.textContent();
  expect(content?.trim()).toBe("");
});

test("displays empty state when visible but no data", async ({ mount }) => {
  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  // Should show empty state message
  await expect(component).toContainText("No todos available");
});

test("displays loading state correctly", async ({ mount }) => {
  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  // Set loading state through component method
  await component.evaluate((el: SketchTodoPanel) => {
    (el as any).loading = true;
  });

  // Should show loading message and spinner
  await expect(component).toContainText("Loading todos...");
  // Check for spinner element (it has animate-spin class)
  await expect(component.locator(".animate-spin")).toBeVisible();
});

test("displays error state correctly", async ({ mount }) => {
  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  // Set error state through component method
  await component.evaluate((el: SketchTodoPanel) => {
    (el as any).error = "Failed to load todo data";
  });

  // Should show error message
  await expect(component).toContainText("Error: Failed to load todo data");
  // Error text should have red color
  await expect(component.locator(".text-red-600")).toBeVisible();
});

test("renders todo items correctly", async ({ mount }) => {
  const mockTodos = [
    createMockTodoItem({
      id: "task-1",
      status: "completed",
      task: "Complete the first task",
    }),
    createMockTodoItem({
      id: "task-2",
      status: "in-progress",
      task: "Work on the second task",
    }),
    createMockTodoItem({
      id: "task-3",
      status: "queued",
      task: "Start the third task",
    }),
  ];

  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  // Update component with todo data
  await component.evaluate((el: SketchTodoPanel, todos) => {
    el.updateTodoContent(JSON.stringify({ items: todos }));
  }, mockTodos);

  // Check that all tasks are rendered
  await expect(component).toContainText("Complete the first task");
  await expect(component).toContainText("Work on the second task");
  await expect(component).toContainText("Start the third task");

  // Check that status icons are present (emojis)
  await expect(component).toContainText("✅"); // completed
  await expect(component).toContainText("🦉"); // in-progress
  await expect(component).toContainText("⚪"); // queued
});

test("displays correct todo count in header", async ({ mount }) => {
  const mockTodos = [
    createMockTodoItem({ id: "task-1", status: "completed" }),
    createMockTodoItem({ id: "task-2", status: "completed" }),
    createMockTodoItem({ id: "task-3", status: "in-progress" }),
    createMockTodoItem({ id: "task-4", status: "queued" }),
  ];

  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  await component.evaluate((el: SketchTodoPanel, todos) => {
    el.updateTodoContent(JSON.stringify({ items: todos }));
  }, mockTodos);

  // Should show "2/4" (2 completed out of 4 total)
  await expect(component).toContainText("2/4");
  await expect(component).toContainText("Sketching...");
});

test("shows comment button only for non-completed items", async ({ mount }) => {
  const mockTodos = [
    createMockTodoItem({ id: "task-1", status: "completed" }),
    createMockTodoItem({ id: "task-2", status: "in-progress" }),
    createMockTodoItem({ id: "task-3", status: "queued" }),
  ];

  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  await component.evaluate((el: SketchTodoPanel, todos) => {
    el.updateTodoContent(JSON.stringify({ items: todos }));
  }, mockTodos);

  // Comment buttons (💬) should only appear for in-progress and queued items
  const commentButtons = component.locator('button[title*="Add comment"]');
  await expect(commentButtons).toHaveCount(2); // Only for in-progress and queued
});

test("opens comment box when comment button is clicked", async ({ mount }) => {
  const mockTodos = [
    createMockTodoItem({
      id: "task-1",
      status: "in-progress",
      task: "Work on important task",
    }),
  ];

  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  await component.evaluate((el: SketchTodoPanel, todos) => {
    el.updateTodoContent(JSON.stringify({ items: todos }));
  }, mockTodos);

  // Click the comment button
  await component.locator('button[title*="Add comment"]').click();

  // Comment overlay should be visible
  await expect(component.locator(".fixed.inset-0")).toBeVisible();
  await expect(component).toContainText("Comment on TODO Item");
  await expect(component).toContainText("Status: In Progress");
  await expect(component).toContainText("Work on important task");
});

test("closes comment box when cancel is clicked", async ({ mount }) => {
  const mockTodos = [createMockTodoItem({ id: "task-1", status: "queued" })];

  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  await component.evaluate((el: SketchTodoPanel, todos) => {
    el.updateTodoContent(JSON.stringify({ items: todos }));
  }, mockTodos);

  // Open comment box
  await component.locator('button[title*="Add comment"]').click();
  await expect(component.locator(".fixed.inset-0")).toBeVisible();

  // Click cancel
  await component.locator('button:has-text("Cancel")').click();

  // Comment overlay should be hidden
  await expect(component.locator(".fixed.inset-0")).not.toBeVisible();
});

test("dispatches todo-comment event when comment is submitted", async ({
  mount,
}) => {
  const mockTodos = [
    createMockTodoItem({
      id: "task-1",
      status: "in-progress",
      task: "Important task",
    }),
  ];

  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  await component.evaluate((el: SketchTodoPanel, todos) => {
    el.updateTodoContent(JSON.stringify({ items: todos }));
  }, mockTodos);

  // Set up event listener
  const eventPromise = component.evaluate((el: SketchTodoPanel) => {
    return new Promise((resolve) => {
      (el as any).addEventListener(
        "todo-comment",
        (e: any) => {
          resolve(e.detail.comment);
        },
        { once: true },
      );
    });
  });

  // Open comment box
  await component.locator('button[title*="Add comment"]').click();

  // Fill in comment
  await component
    .locator('textarea[placeholder*="Type your comment"]')
    .fill("This is a test comment");

  // Submit comment
  await component.locator('button:has-text("Add Comment")').click();

  // Wait for event and check content
  const eventDetail = await eventPromise;
  expect(eventDetail).toContain("This is a test comment");
  expect(eventDetail).toContain("Important task");
  expect(eventDetail).toContain("In Progress");

  // Comment box should be closed after submission
  await expect(component.locator(".fixed.inset-0")).not.toBeVisible();
});

test("handles invalid JSON gracefully", async ({ mount }) => {
  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  // Update with invalid JSON
  await component.evaluate((el: SketchTodoPanel) => {
    el.updateTodoContent("{invalid json}");
  });

  // Should show error state
  await expect(component).toContainText("Error: Failed to parse todo data");
});

test("handles empty content gracefully", async ({ mount }) => {
  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  // Update with empty content
  await component.evaluate((el: SketchTodoPanel) => {
    el.updateTodoContent("");
  });

  // Should show empty state
  await expect(component).toContainText("No todos available");
});

test("renders with proper Tailwind classes", async ({ mount }) => {
  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  // Check main container has correct Tailwind classes
  const container = component.locator(".flex.flex-col.h-full");
  await expect(container).toBeVisible();
});

test("displays todos in scrollable container", async ({ mount }) => {
  const mockTodos = Array.from({ length: 10 }, (_, i) =>
    createMockTodoItem({
      id: `task-${i + 1}`,
      status:
        i % 3 === 0 ? "completed" : i % 3 === 1 ? "in-progress" : "queued",
      task: `Task number ${i + 1} with some description text`,
    }),
  );

  const component = await mount(SketchTodoPanel, {
    props: {
      visible: true,
    },
  });

  await component.evaluate((el: SketchTodoPanel, todos) => {
    el.updateTodoContent(JSON.stringify({ items: todos }));
  }, mockTodos);

  // Check that scrollable container exists
  const scrollContainer = component.locator(".overflow-y-auto");
  await expect(scrollContainer).toBeVisible();

  // All tasks should be rendered
  for (let i = 1; i <= 10; i++) {
    await expect(component).toContainText(`Task number ${i}`);
  }
});
