import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

import type { GitInfo } from "./types/git_info";
import type { AppSettings } from "./types/settings";
import type { RepoDetails } from "./types/repo_details";

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
