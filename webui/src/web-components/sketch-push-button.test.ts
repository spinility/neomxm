import { test, expect } from "@sand4rt/experimental-ct-web";
import { SketchPushButton } from "./sketch-push-button";

test("does not show GitHub link for non-GitHub remotes", async ({ mount }) => {
  const component = await mount(SketchPushButton, {});

  // Test GitHub remote (should return URL)
  const githubURL = await component.evaluate((el: SketchPushButton) => {
    const githubRemote = {
      name: "origin",
      url: "https://github.com/user/repo.git",
      display_name: "user/repo",
      is_github: true,
    };
    (el as any)._remotes = [githubRemote];
    (el as any)._selectedRemote = "origin";
    (el as any)._branch = "test-branch";
    return (el as any)._computeBranchURL();
  });
  expect(githubURL).toBe("https://github.com/user/repo/tree/test-branch");

  // Test GitLab remote (should return empty string)
  const gitlabURL = await component.evaluate((el: SketchPushButton) => {
    const gitlabRemote = {
      name: "gitlab",
      url: "https://gitlab.com/user/repo.git",
      display_name: "gitlab.com/user/repo",
      is_github: false,
    };
    (el as any)._remotes = [gitlabRemote];
    (el as any)._selectedRemote = "gitlab";
    (el as any)._branch = "test-branch";
    return (el as any)._computeBranchURL();
  });
  expect(gitlabURL).toBe("");

  // Test self-hosted remote (should return empty string)
  const selfHostedURL = await component.evaluate((el: SketchPushButton) => {
    const selfHostedRemote = {
      name: "self",
      url: "https://git.company.com/user/repo.git",
      display_name: "git.company.com/user/repo",
      is_github: false,
    };
    (el as any)._remotes = [selfHostedRemote];
    (el as any)._selectedRemote = "self";
    (el as any)._branch = "test-branch";
    return (el as any)._computeBranchURL();
  });
  expect(selfHostedURL).toBe("");
});

test("handles missing remote gracefully", async ({ mount }) => {
  const component = await mount(SketchPushButton, {});

  // Test with no remotes
  const noRemotesURL = await component.evaluate((el: SketchPushButton) => {
    (el as any)._remotes = [];
    (el as any)._selectedRemote = "";
    (el as any)._branch = "test-branch";
    return (el as any)._computeBranchURL();
  });
  expect(noRemotesURL).toBe("");

  // Test with selected remote that doesn't exist
  const invalidRemoteURL = await component.evaluate((el: SketchPushButton) => {
    (el as any)._remotes = [
      {
        name: "origin",
        url: "https://github.com/user/repo.git",
        display_name: "user/repo",
        is_github: true,
      },
    ];
    (el as any)._selectedRemote = "nonexistent";
    (el as any)._branch = "test-branch";
    return (el as any)._computeBranchURL();
  });
  expect(invalidRemoteURL).toBe("");
});
