import { describe, it, expect } from "vitest";
import { computeGraph, GRAPH_COLORS } from "../src/lib/graph";
import type { Commit } from "../src/api/types/commit";

function makeCommit(hash: string, parents: string[]): Commit {
  return {
    hash,
    short_hash: hash.slice(0, 7),
    parents,
    author_name: "Author",
    author_email: "author@test.com",
    author_date: 1700000000,
    committer_name: "Committer",
    committer_email: "committer@test.com",
    committer_date: 1700000000,
    refs: [],
    subject: `Commit ${hash}`,
    body: "",
  };
}

describe("Git commit graph algorithm (lanes)", () => {
  it("computes linear history in a single lane (column 0)", () => {
    // c3 -> c2 -> c1 (root)
    const commits = [
      makeCommit("c3", ["c2"]),
      makeCommit("c2", ["c1"]),
      makeCommit("c1", []),
    ];

    const result = computeGraph(commits);
    expect(result.nodes).toHaveLength(3);

    expect(result.nodes[0].column).toBe(0);
    expect(result.nodes[1].column).toBe(0);
    expect(result.nodes[2].column).toBe(0);
    expect(result.finalLanes).toHaveLength(0); // Freed after root commit
  });

  it("handles branch and merge correctly", () => {
    // Merge commit m1 has parents: [c_main, c_feat]
    const commits = [
      makeCommit("m1", ["c_main", "c_feat"]),
      makeCommit("c_feat", ["base"]),
      makeCommit("c_main", ["base"]),
      makeCommit("base", []),
    ];

    const result = computeGraph(commits);
    expect(result.nodes).toHaveLength(4);

    // m1 is on col 0, branches out to col 1 for c_feat
    expect(result.nodes[0].column).toBe(0);
    expect(result.nodes[0].branchOutColumns).toContain(1);

    // c_feat is on col 1
    expect(result.nodes[1].column).toBe(1);

    // c_main is on col 0
    expect(result.nodes[2].column).toBe(0);

    // base is on col 0, and col 1 merges in
    expect(result.nodes[3].column).toBe(0);
  });

  it("handles octopus merge with 3+ parents", () => {
    // m_oct has 4 parents
    const commits = [
      makeCommit("m_oct", ["p1", "p2", "p3", "p4"]),
      makeCommit("p1", []),
    ];

    const result = computeGraph(commits);
    const node = result.nodes[0];
    expect(node.column).toBe(0);
    // p1 on col 0, p2 on col 1, p3 on col 2, p4 on col 3
    expect(node.branchOutColumns).toHaveLength(3);
    expect(node.branchOutColumns).toEqual([1, 2, 3]);
  });

  it("preserves lanes across pagination boundaries without line breaks", () => {
    // Page 1 ends with active branches
    const page1Commits = [
      makeCommit("c4", ["c3", "b2"]),
      makeCommit("c3", ["c1"]),
    ];

    const page1Result = computeGraph(page1Commits);
    expect(page1Result.finalLanes).toHaveLength(2);
    expect(page1Result.finalLanes[0]).toBe("c1");
    expect(page1Result.finalLanes[1]).toBe("b2");

    // Page 2 starts using finalLanes from page 1
    const page2Commits = [
      makeCommit("b2", ["b1"]),
      makeCommit("c1", ["root"]),
      makeCommit("b1", ["root"]),
      makeCommit("root", []),
    ];

    const page2Result = computeGraph(page2Commits, page1Result.finalLanes);
    expect(page2Result.nodes[0].column).toBe(1); // b2 stays in column 1!
    expect(page2Result.nodes[1].column).toBe(0); // c1 stays in column 0!
  });

  it("uses 8 distinct accessible colors", () => {
    expect(GRAPH_COLORS).toHaveLength(8);
    const unique = new Set(GRAPH_COLORS);
    expect(unique.size).toBe(8);
  });
});
