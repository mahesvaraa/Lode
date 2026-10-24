use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::State;
use ts_rs::TS;

use crate::error::{AppError, ErrorKind};
use crate::git::GitRunner;
use crate::settings::SettingsManager;
use crate::watcher::RepoWatcher;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/repo_details.ts")]
pub struct RepoDetails {
    pub path: String,
    pub name: String,
    pub current_branch: Option<String>,
}

#[tauri::command]
pub async fn open_repo(
    path: String,
    runner: State<'_, GitRunner>,
    settings: State<'_, SettingsManager>,
    watcher: State<'_, RepoWatcher>,
) -> Result<RepoDetails, AppError> {
    let raw_path = PathBuf::from(&path);
    if !raw_path.exists() {
        return Err(AppError::new(
            ErrorKind::InvalidPath,
            format!("Путь '{path}' не существует"),
            None,
        ));
    }

    let canonical = match raw_path.canonicalize() {
        Ok(p) => p,
        Err(e) => {
            return Err(AppError::new(
                ErrorKind::InvalidPath,
                format!("Не удалось канонизировать путь: {e}"),
                None,
            ));
        }
    };

    // Verify it is inside a git repo: git rev-parse --show-toplevel
    let output = match runner
        .run_read(Some(&canonical), &["rev-parse", "--show-toplevel"])
        .await
    {
        Ok(out) => out,
        Err(_) => {
            return Err(AppError::not_a_repo(&path));
        }
    };

    let toplevel_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let toplevel_path = PathBuf::from(&toplevel_str);

    // Get current branch
    let branch_output = runner
        .run_read(Some(&toplevel_path), &["rev-parse", "--abbrev-ref", "HEAD"])
        .await;

    let current_branch = branch_output.ok().map(|o| {
        let b = String::from_utf8_lossy(&o.stdout).trim().to_string();
        if b == "HEAD" {
            "detached".to_string()
        } else {
            b
        }
    });

    let name = toplevel_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "repository".to_string());

    let final_path_str = toplevel_path.to_string_lossy().to_string();
    let _ = settings.add_recent_repo(&final_path_str);

    // Start watching repository
    watcher.watch_repo(&toplevel_path).await;

    Ok(RepoDetails {
        path: final_path_str,
        name,
        current_branch,
    })
}

#[tauri::command]
pub async fn init_repo(
    path: String,
    initial_branch: Option<String>,
    runner: State<'_, GitRunner>,
    settings: State<'_, SettingsManager>,
    watcher: State<'_, RepoWatcher>,
) -> Result<RepoDetails, AppError> {
    let target = PathBuf::from(&path);
    if !target.exists() {
        std::fs::create_dir_all(&target).map_err(|e| {
            AppError::new(
                ErrorKind::InvalidPath,
                format!("Не удалось создать директорию '{path}': {e}"),
                None,
            )
        })?;
    }

    let branch = initial_branch.as_deref().unwrap_or("main");
    let args = ["init", "-b", branch];

    runner.run_write(&target, &args).await?;
    open_repo(path, runner, settings, watcher).await
}

#[tauri::command]
pub async fn clone_repo(
    url: String,
    target_path: String,
    runner: State<'_, GitRunner>,
    settings: State<'_, SettingsManager>,
    watcher: State<'_, RepoWatcher>,
) -> Result<RepoDetails, AppError> {
    let clean_url = url.trim();
    if clean_url.is_empty() {
        return Err(AppError::new(
            ErrorKind::Unknown,
            "URL репозитория не может быть пустым",
            None,
        ));
    }

    let target = PathBuf::from(&target_path);
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| {
                AppError::new(
                    ErrorKind::InvalidPath,
                    format!("Не удалось создать родительскую директорию: {e}"),
                    None,
                )
            })?;
        }
    }

    let args = ["clone", "--progress", "--", clean_url, &target_path];
    runner.run_clone(None, &args).await?;

    open_repo(target_path, runner, settings, watcher).await
}
