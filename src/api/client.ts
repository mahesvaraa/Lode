import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

import type { GitInfo } from "./types/git_info";
import type { AppSettings } from "./types/settings";
import type { RepoDetails } from "./types/repo_details";
import type { RepoStatus } from "./types/repo_status";
import type { FileDiff } from "./types/file_diff";
import type { RepoChangedEvent } from "./types/repo_changed_event";
import type { Commit } from "./types/commit";
import type { CommitDetails } from "./types/commit_details";
import type { RepoRefs } from "./types/repo_refs";
import type { RepoState } from "./types/repo_state";
import type { Remote } from "./types/remote";
import type { PullMode } from "./types/pull_mode";
import type { ParsedConflictFile } from "./types/parsed_conflict_file";
import type { StashItem } from "./types/stash_item";
import type { BlameLine } from "./types/blame_line";
import type { RebaseTodoItem } from "./types/rebase_todo_item";

export async function checkGit(): Promise<GitInfo> {
  return invoke<GitInfo>("check_git");
}

export async function setCustomGitPath(path: string | null): Promise<GitInfo> {
  return invoke<GitInfo>("set_custom_git_path", { path });
}

export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

export async function saveTheme(theme: string): Promise<AppSettings> {
  return invoke<AppSettings>("save_theme", { theme });
}

export async function removeRecentRepo(path: string): Promise<AppSettings> {
  return invoke<AppSettings>("remove_recent_repo", { path });
}

export async function openRepo(path: string): Promise<RepoDetails> {
  return invoke<RepoDetails>("open_repo", { path });
}

export async function getStatus(repoPath: string): Promise<RepoStatus> {
  return invoke<RepoStatus>("get_status", { repoPath });
}

export async function getDiff(
  repoPath: string,
  filePath: string,
  staged: boolean
): Promise<FileDiff> {
  return invoke<FileDiff>("get_diff", { repoPath, filePath, staged });
}

export async function getCommitDiff(
  repoPath: string,
  commitHash: string,
  filePath: string
): Promise<FileDiff> {
  return invoke<FileDiff>("get_commit_diff", { repoPath, commitHash, filePath });
}

export async function getCommits(
  repoPath: string,
  skip: number,
  limit: number,
  branch?: string,
  search?: string
): Promise<Commit[]> {
  return invoke<Commit[]>("get_commits", {
    repoPath,
    skip,
    limit,
    branch: branch || null,
    search: search || null,
  });
}

export async function getCommitDetails(
  repoPath: string,
  hash: string
): Promise<CommitDetails> {
  return invoke<CommitDetails>("get_commit_details", { repoPath, hash });
}

export async function getRefs(repoPath: string): Promise<RepoRefs> {
  return invoke<RepoRefs>("get_refs", { repoPath });
}

export async function getRepoState(repoPath: string): Promise<RepoState> {
  return invoke<RepoState>("get_repo_state", { repoPath });
}

export async function createBranch(
  repoPath: string,
  name: string,
  startPoint?: string,
  switchTo: boolean = false
): Promise<void> {
  return invoke<void>("create_branch", {
    repoPath,
    name,
    startPoint: startPoint || null,
    switchTo,
  });
}

export async function switchBranch(repoPath: string, name: string): Promise<void> {
  return invoke<void>("switch_branch", { repoPath, name });
}

export async function renameBranch(
  repoPath: string,
  oldName: string,
  newName: string
): Promise<void> {
  return invoke<void>("rename_branch", { repoPath, oldName, newName });
}

export async function deleteBranch(
  repoPath: string,
  name: string,
  force: boolean = false
): Promise<void> {
  return invoke<void>("delete_branch", { repoPath, name, force });
}

export async function createTag(
  repoPath: string,
  name: string,
  targetHash?: string,
  message?: string
): Promise<void> {
  return invoke<void>("create_tag", {
    repoPath,
    name,
    targetHash: targetHash || null,
    message: message || null,
  });
}

export async function deleteTag(repoPath: string, name: string): Promise<void> {
  return invoke<void>("delete_tag", { repoPath, name });
}

export async function mergeBranch(
  repoPath: string,
  branchOrRef: string,
  noFf: boolean = false
): Promise<RepoState> {
  return invoke<RepoState>("merge_branch", {
    repoPath,
    branchOrRef,
    noFf,
  });
}

export async function abortMerge(repoPath: string): Promise<RepoState> {
  return invoke<RepoState>("abort_merge", { repoPath });
}

// Remote API
export async function listRemotes(repoPath: string): Promise<Remote[]> {
  return invoke<Remote[]>("list_remotes", { repoPath });
}

export async function addRemote(
  repoPath: string,
  name: string,
  url: string
): Promise<void> {
  return invoke<void>("add_remote", { repoPath, name, url });
}

export async function removeRemote(
  repoPath: string,
  name: string
): Promise<void> {
  return invoke<void>("remove_remote", { repoPath, name });
}

export async function renameRemote(
  repoPath: string,
  oldName: string,
  newName: string
): Promise<void> {
  return invoke<void>("rename_remote", { repoPath, oldName, newName });
}

export async function setRemoteUrl(
  repoPath: string,
  name: string,
  url: string
): Promise<void> {
  return invoke<void>("set_remote_url", { repoPath, name, url });
}

export async function fetchAll(
  repoPath: string,
  prune: boolean = true
): Promise<string> {
  return invoke<string>("fetch_all", { repoPath, prune });
}

export async function pull(
  repoPath: string,
  remote?: string,
  branch?: string,
  mode?: PullMode
): Promise<string> {
  return invoke<string>("pull", {
    repoPath,
    remote: remote || null,
    branch: branch || null,
    mode: mode || null,
  });
}

export async function push(
  repoPath: string,
  remote?: string,
  branch?: string,
  setUpstream: boolean = false,
  forceWithLease: boolean = false
): Promise<string> {
  return invoke<string>("push", {
    repoPath,
    remote: remote || null,
    branch: branch || null,
    setUpstream,
    forceWithLease,
  });
}

// Conflict API
export async function getConflictFile(
  repoPath: string,
  path: string
): Promise<ParsedConflictFile> {
  return invoke<ParsedConflictFile>("get_conflict_file", { repoPath, path });
}

export async function resolveConflictFile(
  repoPath: string,
  path: string,
  content: string
): Promise<void> {
  return invoke<void>("resolve_conflict_file", { repoPath, path, content });
}

export async function resolveConflictChoice(
  repoPath: string,
  path: string,
  choice: string
): Promise<void> {
  return invoke<void>("resolve_conflict_choice", { repoPath, path, choice });
}

export async function regenerateConflictDiff3(
  repoPath: string,
  path: string
): Promise<ParsedConflictFile> {
  return invoke<ParsedConflictFile>("regenerate_conflict_diff3", {
    repoPath,
    path,
  });
}

export async function continueOperation(
  repoPath: string,
  message?: string
): Promise<RepoState> {
  return invoke<RepoState>("continue_operation", {
    repoPath,
    message: message || null,
  });
}

// Stage 7: Stash, Cherry-pick, Revert, Reset, Blame, File History
export async function listStashes(repoPath: string): Promise<StashItem[]> {
  return invoke<StashItem[]>("list_stashes", { repoPath });
}

export async function stashSave(
  repoPath: string,
  message?: string,
  includeUntracked: boolean = true
): Promise<string> {
  return invoke<string>("stash_save", {
    repoPath,
    message: message || null,
    includeUntracked,
  });
}

export async function stashApply(
  repoPath: string,
  selector: string
): Promise<void> {
  return invoke<void>("stash_apply", { repoPath, selector });
}

export async function stashPop(
  repoPath: string,
  selector: string
): Promise<void> {
  return invoke<void>("stash_pop", { repoPath, selector });
}

export async function stashDrop(
  repoPath: string,
  selector: string
): Promise<void> {
  return invoke<void>("stash_drop", { repoPath, selector });
}

export async function stashShowDiff(
  repoPath: string,
  selector: string
): Promise<string> {
  return invoke<string>("stash_show_diff", { repoPath, selector });
}

export async function cherryPick(
  repoPath: string,
  commitHash: string,
  parentNumber?: number
): Promise<void> {
  return invoke<void>("cherry_pick", {
    repoPath,
    commitHash,
    parentNumber: parentNumber || null,
  });
}

export async function revertCommit(
  repoPath: string,
  commitHash: string
): Promise<void> {
  return invoke<void>("revert_commit", { repoPath, commitHash });
}

export async function resetRepo(
  repoPath: string,
  targetRef: string,
  mode: "soft" | "mixed" | "hard"
): Promise<void> {
  return invoke<void>("reset_repo", { repoPath, targetRef, mode });
}

export async function getBlame(
  repoPath: string,
  path: string
): Promise<BlameLine[]> {
  return invoke<BlameLine[]>("get_blame", { repoPath, path });
}

export async function getFileHistory(
  repoPath: string,
  path: string,
  limit?: number
): Promise<Commit[]> {
  return invoke<Commit[]>("get_file_history", {
    repoPath,
    path,
    limit: limit || null,
  });
}

// Stage 8: Interactive Rebase
export async function getRebaseTodoList(
  repoPath: string,
  baseRef: string
): Promise<RebaseTodoItem[]> {
  return invoke<RebaseTodoItem[]>("get_rebase_todo_list", { repoPath, baseRef });
}

export async function startInteractiveRebase(
  repoPath: string,
  baseRef: string,
  items: RebaseTodoItem[]
): Promise<RepoState> {
  return invoke<RepoState>("start_interactive_rebase", {
    repoPath,
    baseRef,
    items,
  });
}

export async function stageFile(repoPath: string, path: string): Promise<void> {
  return invoke<void>("stage_file", { repoPath, path });
}

export async function unstageFile(repoPath: string, path: string): Promise<void> {
  return invoke<void>("unstage_file", { repoPath, path });
}

export async function stageAll(repoPath: string): Promise<void> {
  return invoke<void>("stage_all", { repoPath });
}

export async function unstageAll(repoPath: string): Promise<void> {
  return invoke<void>("unstage_all", { repoPath });
}

export async function stageHunk(
  repoPath: string,
  path: string,
  hunkIndex: number
): Promise<void> {
  return invoke<void>("stage_hunk", { repoPath, path, hunkIndex });
}

export async function unstageHunk(
  repoPath: string,
  path: string,
  hunkIndex: number
): Promise<void> {
  return invoke<void>("unstage_hunk", { repoPath, path, hunkIndex });
}

export async function stageLines(
  repoPath: string,
  path: string,
  hunkIndex: number,
  lineIndices: number[]
): Promise<void> {
  return invoke<void>("stage_lines", { repoPath, path, hunkIndex, lineIndices });
}

export async function unstageLines(
  repoPath: string,
  path: string,
  hunkIndex: number,
  lineIndices: number[]
): Promise<void> {
  return invoke<void>("unstage_lines", { repoPath, path, hunkIndex, lineIndices });
}

export async function discardLines(
  repoPath: string,
  path: string,
  hunkIndex: number,
  lineIndices: number[]
): Promise<void> {
  return invoke<void>("discard_lines", { repoPath, path, hunkIndex, lineIndices });
}

export async function discardFile(
  repoPath: string,
  path: string,
  isUntracked: boolean
): Promise<void> {
  return invoke<void>("discard_file", { repoPath, path, isUntracked });
}

export async function createCommit(
  repoPath: string,
  message: string,
  amend: boolean
): Promise<string> {
  return invoke<string>("create_commit", { repoPath, message, amend });
}

export async function listenToRepoChanged(
  callback: (event: RepoChangedEvent) => void
): Promise<UnlistenFn> {
  return listen<RepoChangedEvent>("repo:changed", (e) => {
    callback(e.payload);
  });
}

export async function pickFolder(): Promise<string | null> {
  const selected = await openDialog({
    directory: true,
    multiple: false,
    title: "Выберите папку репозитория",
  });

  if (typeof selected === "string") {
    return selected;
  }
  return null;
}
