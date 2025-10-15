import { test, expect } from "@sand4rt/experimental-ct-web";
import { SketchDiffRangePicker } from "./sketch-diff-range-picker";
import { GitDataService } from "./git-data-service";
import { GitLogEntry } from "../types";

// Mock GitDataService
class MockGitDataService {
  async getBaseCommitRef(): Promise<string> {
    return "sketch-base";
  }

  async getCommitHistory(): Promise<GitLogEntry[]> {
    return [
      {
        hash: "abc123456",
        subject: "Test commit",
        refs: ["refs/heads/main"],
      },
    ];
  }
}

test("initializes with empty commits array", async ({ mount }) => {
  const component = await mount(SketchDiffRangePicker, {});

  // Check initial state
  const commits = await component.evaluate(
    (el: SketchDiffRangePicker) => el.commits,
  );
  expect(commits).toEqual([]);
});

test("renders without errors", async ({ mount }) => {
  const mockGitService = new MockGitDataService() as unknown as GitDataService;
  const component = await mount(SketchDiffRangePicker, {
    props: {
      gitService: mockGitService,
    },
  });

  // Check that the component was created successfully
  const tagName = await component.evaluate(
    (el: SketchDiffRangePicker) => el.tagName,
  );
  expect(tagName.toLowerCase()).toBe("sketch-diff-range-picker");
});

test("extends SketchTailwindElement (no shadow DOM)", async ({ mount }) => {
  const component = await mount(SketchDiffRangePicker, {});

  // Test that it uses the correct base class by checking if createRenderRoot returns the element itself
  // This is the key difference between SketchTailwindElement and LitElement
  const renderRoot = await component.evaluate((el: SketchDiffRangePicker) => {
    return el.createRenderRoot() === el;
  });
  expect(renderRoot).toBe(true);
});
