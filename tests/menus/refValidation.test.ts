import { describe, it, expect } from "vitest";
import { validateBranchName } from "@/features/dialogs/CreateBranchModal";

describe("validateBranchName", () => {
  it("approves valid branch names", () => {
    expect(validateBranchName("main")).toBeNull();
    expect(validateBranchName("feature/login")).toBeNull();
    expect(validateBranchName("bugfix-123")).toBeNull();
    expect(validateBranchName("release/v1.0.0")).toBeNull();
  });

  it("rejects empty names", () => {
    expect(validateBranchName("")).not.toBeNull();
    expect(validateBranchName("   ")).not.toBeNull();
  });

  it("rejects names with whitespace", () => {
    expect(validateBranchName("feature branch")).toContain("пробел");
  });

  it("rejects names with invalid git characters", () => {
    expect(validateBranchName("feature~1")).not.toBeNull();
    expect(validateBranchName("feature^2")).not.toBeNull();
    expect(validateBranchName("feature:test")).not.toBeNull();
    expect(validateBranchName("feature?")).not.toBeNull();
    expect(validateBranchName("feature*")).not.toBeNull();
    expect(validateBranchName("feature[a]")).not.toBeNull();
    expect(validateBranchName("feature\\test")).not.toBeNull();
  });

  it("rejects names with consecutive dots or slashes", () => {
    expect(validateBranchName("feature..branch")).toContain("..");
    expect(validateBranchName("feature//branch")).toContain("//");
  });

  it("rejects names starting or ending with slashes or dots", () => {
    expect(validateBranchName("/feature")).not.toBeNull();
    expect(validateBranchName("feature/")).not.toBeNull();
    expect(validateBranchName(".feature")).not.toBeNull();
    expect(validateBranchName("feature.")).not.toBeNull();
  });

  it("rejects names ending with .lock", () => {
    expect(validateBranchName("feature.lock")).toContain(".lock");
  });
});
