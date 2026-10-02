import { describe, it, expect } from "vitest";
import {
  hasConflictMarkers,
  parseConflictContent,
  resolveBlockInContent,
} from "../src/lib/conflictParser";

describe("conflictParser", () => {
  it("detects conflict markers correctly", () => {
    expect(hasConflictMarkers("<<<<<<< HEAD\ncode\n=======\ncode\n>>>>>>> feature")).toBe(true);
    expect(hasConflictMarkers("const x = 5;\nconst y = 10;")).toBe(false);
    expect(hasConflictMarkers("if (a <<<<<<< 2) { return; }")).toBe(false);
  });

  it("parses 2-way conflict and identical changes", () => {
    const raw = "head\n<<<<<<< HEAD\nsame\n=======\nsame\n>>>>>>> feat\ntail";
    const parsed = parseConflictContent("file.txt", raw);
    expect(parsed.has_markers).toBe(true);
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].is_identical).toBe(true);
    expect(parsed.blocks[0].ours).toBe("same");
    expect(parsed.blocks[0].theirs).toBe("same");
    expect(parsed.clean_text_suggestion).toBe("head\nsame\ntail");
  });

  it("parses diff3 conflict with base", () => {
    const raw = "<<<<<<< HEAD\nleft\n||||||| base\nancestor\n=======\nright\n>>>>>>> feat";
    const parsed = parseConflictContent("file.txt", raw);
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].base).toBe("ancestor");
    expect(parsed.blocks[0].ours).toBe("left");
    expect(parsed.blocks[0].theirs).toBe("right");
    expect(parsed.blocks[0].is_identical).toBe(false);
  });

  it("resolves blocks correctly", () => {
    const raw = "head\n<<<<<<< HEAD\nleft line\n=======\nright line\n>>>>>>> feat\ntail";
    const parsed = parseConflictContent("file.txt", raw);
    const block = parsed.blocks[0];

    const withOurs = resolveBlockInContent(raw, block, "ours");
    expect(withOurs).toBe("head\nleft line\ntail");
    expect(hasConflictMarkers(withOurs)).toBe(false);

    const withTheirs = resolveBlockInContent(raw, block, "theirs");
    expect(withTheirs).toBe("head\nright line\ntail");
    expect(hasConflictMarkers(withTheirs)).toBe(false);

    const withBoth = resolveBlockInContent(raw, block, "both-ours-theirs");
    expect(withBoth).toBe("head\nleft line\nright line\ntail");
    expect(hasConflictMarkers(withBoth)).toBe(false);
  });
});
