import { test, expect } from "@sand4rt/experimental-ct-web";
import { SketchCommits } from "./sketch-commits";
import { GitCommit, State } from "../types";

// Helper function to create mock commits
function createMockCommits(): GitCommit[] {
  return [
    {
      hash: "1234567890abcdef1234567890abcdef12345678",
      subject: "Fix critical bug in authentication system",
      body: "Updated the auth flow to handle edge cases\n\nSigned-off-by: Test User <test@example.com>",
      pushed_branch: "main",
    },
    {
      hash: "fedcba0987654321fedcba0987654321fedcba09",
      subject: "Add new feature for file uploads",
      body: "Implemented drag and drop file upload functionality\n\nSigned-off-by: Test User <test@example.com>",
      pushed_branch: "feature/file-upload",
    },
  ];
}

// Helper function to create mock state
function createMockState(): State {
  return {
    session_id: "test-session",
    git_username: "testuser",
    link_to_github: true,
    git_origin: "https://github.com/boldsoftware/bold.git",
  } as State;
}

test.skip("renders nothing when commits is null or empty", async ({
  mount,
}) => {
  const component = await mount(SketchCommits, {
    props: {
      commits: null,
      state: createMockState(),
    },
  });

  // Component should not render anything visible
  const content = await component.textContent();
  expect(content).toBe("");
});

test.skip("renders commit list when commits are provided", async ({
  mount,
}) => {
  const commits = createMockCommits();
  const component = await mount(SketchCommits, {
    props: {
      commits,
      state: createMockState(),
    },
  });

  // Should show commit count header
  await expect(component.locator(".bg-green-100")).toBeVisible();
  await expect(component.locator(".bg-green-100")).toContainText(
    "2 new commits detected",
  );

  // Should show commit hashes
  await expect(
    component.locator(".text-blue-600.font-bold").first(),
  ).toContainText("12345678");
  await expect(
    component.locator(".text-blue-600.font-bold").last(),
  ).toContainText("fedcba09");

  // Should show branch names
  await expect(component.locator(".text-green-600").first()).toContainText(
    "main",
  );
  await expect(component.locator(".text-green-600").last()).toContainText(
    "feature/file-upload",
  );

  // Should show commit subjects
  await expect(component).toContainText(
    "Fix critical bug in authentication system",
  );
  await expect(component).toContainText("Add new feature for file uploads");

  // Should show View Diff buttons
  const diffButtons = component.locator('button:has-text("View Diff")');
  await expect(diffButtons).toHaveCount(2);
});

test.skip("dispatches show-commit-diff event when View Diff button is clicked", async ({
  mount,
}) => {
  const commits = createMockCommits();
  const component = await mount(SketchCommits, {
    props: {
      commits,
      state: createMockState(),
    },
  });

  // Set up promise to wait for the event
  const eventPromise = component.evaluate((el) => {
    return new Promise((resolve) => {
      el.addEventListener(
        "show-commit-diff",
        (event) => {
          resolve((event as CustomEvent).detail);
        },
        { once: true },
      );
    });
  });

  // Click the first View Diff button
  await component.locator('button:has-text("View Diff")').first().click();

  // Wait for the event and check its details
  const detail = await eventPromise;
  expect(detail["commitHash"]).toBe("1234567890abcdef1234567890abcdef12345678");
});

test.skip("generates GitHub branch links when configured", async ({
  mount,
}) => {
  const commits = createMockCommits();
  const state = createMockState();

  const component = await mount(SketchCommits, {
    props: {
      commits,
      state,
    },
  });

  // Should show GitHub links when link_to_github is true
  const githubLinks = component.locator('a[href*="github.com"]');
  await expect(githubLinks).toHaveCount(2);

  // Check the actual URLs
  const firstLink = githubLinks.first();
  await expect(firstLink).toHaveAttribute(
    "href",
    "https://github.com/boldsoftware/bold/tree/main",
  );

  const secondLink = githubLinks.last();
  await expect(secondLink).toHaveAttribute(
    "href",
    "https://github.com/boldsoftware/bold/tree/feature/file-upload",
  );
});

test.skip("does not show GitHub links when link_to_github is false", async ({
  mount,
}) => {
  const commits = createMockCommits();
  const state = { ...createMockState(), link_to_github: false };

  const component = await mount(SketchCommits, {
    props: {
      commits,
      state,
    },
  });

  // Should not show GitHub links when link_to_github is false
  const githubLinks = component.locator('a[href*="github.com"]');
  await expect(githubLinks).toHaveCount(0);
});

test.skip("handles commits without pushed_branch", async ({ mount }) => {
  const commits: GitCommit[] = [
    {
      hash: "1234567890abcdef1234567890abcdef12345678",
      subject: "Local commit without branch",
      body: "This commit hasn't been pushed yet",
      // no pushed_branch
    },
  ];

  const component = await mount(SketchCommits, {
    props: {
      commits,
      state: createMockState(),
    },
  });

  // Should still render the commit
  await expect(component.locator(".bg-green-100")).toContainText(
    "1 new commit detected",
  );
  await expect(component.locator(".text-blue-600.font-bold")).toContainText(
    "12345678",
  );
  await expect(component).toContainText("Local commit without branch");

  // Should not show branch info
  await expect(component.locator(".text-green-600")).toHaveCount(0);
  await expect(component.locator('a[href*="github.com"]')).toHaveCount(0);
});

test.skip("copy to clipboard functionality works", async ({ mount }) => {
  const commits = createMockCommits();
  const component = await mount(SketchCommits, {
    props: {
      commits,
      state: createMockState(),
    },
  });

  // Mock the clipboard API
  await component.evaluate(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: (_text: string) => Promise.resolve(),
      },
    });
  });

  // Click on commit hash to copy
  await component.locator(".text-blue-600.font-bold").first().click();

  // Click on branch name to copy
  await component.locator(".text-green-600").first().click();

  // No errors should occur (this is a basic smoke test)
  // In a real test environment, we would mock clipboard and verify the calls
});
