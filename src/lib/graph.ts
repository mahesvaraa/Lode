import type { Commit } from "@/api/types/commit";

export const GRAPH_COLORS = [
  "#4f5bd5", // Indigo/Blue
  "#c39bff", // Purple
  "#38bdf8", // Sky blue
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#f472b6", // Pink
  "#a78bfa", // Violet
  "#fb923c", // Orange
];

export interface GraphNode {
  commitHash: string;
  column: number;
  colorIndex: number;
  color: string;
  passThroughColumns: number[];
  mergeInColumns: number[];
  branchOutColumns: number[];
  maxColumn: number;
}

export interface GraphCalculationResult {
  nodes: GraphNode[];
  finalLanes: (string | null)[];
}

/**
 * Pure function computing the Git commit graph lanes according to Section 6.3 of CLAUDE.md.
 * State is preserved between pages via `initialLanes` so pagination does not break graph lines.
 */
export function computeGraph(
  commits: Commit[],
  initialLanes: (string | null)[] = []
): GraphCalculationResult {
  const lanes = [...initialLanes];
  const nodes: GraphNode[] = [];

  for (const commit of commits) {
    // 1. Find all columns expecting this commit hash
    const matchingCols: number[] = [];
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] === commit.hash) {
        matchingCols.push(i);
      }
    }

    let col: number;
    let mergeIn: number[] = [];

    if (matchingCols.length > 0) {
      col = matchingCols[0];
      mergeIn = matchingCols.slice(1);
      // Free columns that merged into col
      for (const m of mergeIn) {
        lanes[m] = null;
      }
    } else {
      // Find first free column or allocate a new one
      const freeIdx = lanes.indexOf(null);
      if (freeIdx !== -1) {
        col = freeIdx;
      } else {
        col = lanes.length;
        lanes.push(null);
      }
    }

    // 2. Identify pass-through columns before assigning parents
    const passThroughColumns: number[] = [];
    for (let i = 0; i < lanes.length; i++) {
      if (i !== col && !mergeIn.includes(i) && lanes[i] !== null) {
        passThroughColumns.push(i);
      }
    }

    // 3. Assign parents
    const branchOut: number[] = [];
    if (commit.parents.length > 0) {
      // First parent continues in the same column
      lanes[col] = commit.parents[0];

      // Additional parents (merges / octopus merges)
      for (let pIdx = 1; pIdx < commit.parents.length; pIdx++) {
        const pHash = commit.parents[pIdx];
        const existingCol = lanes.indexOf(pHash);
        if (existingCol !== -1) {
          branchOut.push(existingCol);
        } else {
          // Allocate free column or append
          const freeCol = lanes.indexOf(null);
          if (freeCol !== -1) {
            lanes[freeCol] = pHash;
            branchOut.push(freeCol);
          } else {
            const newCol = lanes.length;
            lanes.push(pHash);
            branchOut.push(newCol);
          }
        }
      }
    } else {
      // Root commit without parents: column is freed
      lanes[col] = null;
    }

    // Trim trailing nulls from lanes
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
      lanes.pop();
    }

    const allActiveCols = [col, ...passThroughColumns, ...mergeIn, ...branchOut];
    const maxColumn = allActiveCols.length > 0 ? Math.max(...allActiveCols) : 0;
    const colorIndex = col % GRAPH_COLORS.length;

    nodes.push({
      commitHash: commit.hash,
      column: col,
      colorIndex,
      color: GRAPH_COLORS[colorIndex],
      passThroughColumns,
      mergeInColumns: mergeIn,
      branchOutColumns: branchOut,
      maxColumn,
    });
  }

  return {
    nodes,
    finalLanes: lanes,
  };
}
