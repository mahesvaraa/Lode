import type { RepoState } from "@/api/types/repo_state";
import type { RepoStatus } from "@/api/types/repo_status";
import type { RepoRefs } from "@/api/types/repo_refs";
import type { Commit } from "@/api/types/commit";

export interface RepoContext {
  repoPath: string;
  repoState: RepoState | null;
  status: RepoStatus | null;
  refs: RepoRefs | null;
  currentBranch: string | null;
  selectedCommitHashes?: string[];
  selectedFilePaths?: string[];
  commits?: Commit[];
}

export type MenuContextTarget =
  | { type: "commit"; hash: string; commit?: Commit }
  | { type: "branch"; name: string; isCurrent: boolean; upstream?: string | null }
  | { type: "remote-branch"; fullName: string; remote: string; branch: string }
  | { type: "remote"; name: string; url?: string }
  | { type: "tag"; name: string }
  | { type: "stash"; index: number; message?: string }
  | {
      type: "working-file";
      path: string;
      isStaged: boolean;
      isUntracked: boolean;
      isConflicted: boolean;
    }
  | { type: "commit-file"; path: string; commitHash: string }
  | { type: "hunk"; path: string; hunkIndex: number; isStaged: boolean }
  | { type: "blame-line"; lineNo: number; hash: string; path: string }
  | { type: "conflict-block"; blockIndex: number; totalBlocks: number }
  | { type: "empty-history" }
  | { type: "sidebar-section"; sectionId: string }
  | { type: "repo-header" }
  | { type: "state-banner" }
  | { type: "editable"; targetElement: HTMLInputElement | HTMLTextAreaElement };

export type MenuActionHandler = (actionId: string, params?: unknown) => void | Promise<void>;
