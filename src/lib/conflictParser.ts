import type { ConflictBlock } from "@/api/types/conflict_block";
import type { ParsedConflictFile } from "@/api/types/parsed_conflict_file";

export function isMarkerStart(line: string, marker: string): boolean {
  if (line.startsWith(marker)) {
    const rest = line.slice(marker.length);
    return rest.length === 0 || rest.startsWith(" ") || rest.startsWith("\t");
  }
  return false;
}

export function hasConflictMarkers(content: string): boolean {
  const lines = content.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (
      isMarkerStart(line, "<<<<<<<") ||
      isMarkerStart(line, "=======") ||
      isMarkerStart(line, ">>>>>>>") ||
      isMarkerStart(line, "|||||||")
    ) {
      return true;
    }
  }
  return false;
}

export function parseConflictContent(path: string, content: string): ParsedConflictFile {
  const crlf = content.includes("\r\n");
  const newline = crlf ? "\r\n" : "\n";

  const blocks: ConflictBlock[] = [];
  const cleanLines: string[] = [];

  let state: "Outside" | "InOurs" | "InBase" | "InTheirs" = "Outside";
  let blockId = 0;

  let currentStartLine = 0;
  let currentBase: string[] | null = null;
  let currentOurs: string[] = [];
  let currentTheirs: string[] = [];

  const lines = content.split("\n");

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    const lineNum = idx + 1;

    switch (state) {
      case "Outside":
        if (isMarkerStart(line, "<<<<<<<")) {
          state = "InOurs";
          currentStartLine = lineNum;
          currentBase = null;
          currentOurs = [];
          currentTheirs = [];
        } else {
          cleanLines.push(line);
        }
        break;

      case "InOurs":
        if (isMarkerStart(line, "|||||||")) {
          state = "InBase";
          currentBase = [];
        } else if (isMarkerStart(line, "=======")) {
          state = "InTheirs";
        } else {
          currentOurs.push(line);
        }
        break;

      case "InBase":
        if (isMarkerStart(line, "=======")) {
          state = "InTheirs";
        } else if (currentBase) {
          currentBase.push(line);
        }
        break;

      case "InTheirs":
        if (isMarkerStart(line, ">>>>>>>")) {
          const oursStr = currentOurs.join(newline);
          const theirsStr = currentTheirs.join(newline);
          const baseStr = currentBase ? currentBase.join(newline) : null;
          const isIdentical = oursStr === theirsStr;

          blocks.push({
            id: blockId,
            base: baseStr,
            ours: oursStr,
            theirs: theirsStr,
            start_line: currentStartLine,
            end_line: lineNum,
            is_identical: isIdentical,
          });
          blockId++;

          if (isIdentical) {
            cleanLines.push(...currentOurs);
          }

          state = "Outside";
        } else {
          currentTheirs.push(line);
        }
        break;
    }
  }

  return {
    path,
    has_markers: blocks.length > 0,
    crlf,
    blocks,
    clean_text_suggestion: cleanLines.join(newline),
  };
}

export type BlockResolutionChoice =
  | "ours"
  | "theirs"
  | "base"
  | "both-ours-theirs"
  | "both-theirs-ours";

export function resolveBlockInContent(
  content: string,
  block: ConflictBlock,
  choice: BlockResolutionChoice
): string {
  const crlf = content.includes("\r\n");
  const newline = crlf ? "\r\n" : "\n";
  const lines = content.split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));

  let replacement: string[];
  switch (choice) {
    case "ours":
      replacement = block.ours ? block.ours.split(newline) : [];
      break;
    case "theirs":
      replacement = block.theirs ? block.theirs.split(newline) : [];
      break;
    case "base":
      replacement = block.base ? block.base.split(newline) : [];
      break;
    case "both-ours-theirs": {
      const o = block.ours ? block.ours.split(newline) : [];
      const t = block.theirs ? block.theirs.split(newline) : [];
      replacement = [...o, ...t];
      break;
    }
    case "both-theirs-ours": {
      const o = block.ours ? block.ours.split(newline) : [];
      const t = block.theirs ? block.theirs.split(newline) : [];
      replacement = [...t, ...o];
      break;
    }
  }

  // start_line and end_line are 1-based
  const before = lines.slice(0, block.start_line - 1);
  const after = lines.slice(block.end_line);

  return [...before, ...replacement, ...after].join(newline);
}
