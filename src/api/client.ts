import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

import type { GitInfo } from "./types/git_info";
import type { AppSettings } from "./types/settings";
import type { RepoDetails } from "./types/repo_details";
import type { RepoStatus } from "./types/repo_status";
import type { FileDiff } from "./types/file_diff";
import type { RepoChangedEvent } from "./types/repo_changed_event";

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
