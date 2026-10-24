use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{parse_worktree_list, WorktreeInfo};
use crate::git::GitRunner;

#[tauri::command]
pub async fn get_worktrees(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<Vec<WorktreeInfo>, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let output = runner
        .run_read(Some(&canonical), &["worktree", "list", "--porcelain"])
        .await?;

    Ok(parse_worktree_list(&output.stdout))
}

#[tauri::command]
pub async fn add_worktree(
    repo_path: String,
    path: String,
    branch: Option<String>,
    new_branch: Option<String>,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let mut args = vec!["worktree", "add"];

    if let Some(ref nb) = new_branch {
        args.push("-b");
        args.push(nb.as_str());
        args.push(path.as_str());
        if let Some(ref base) = branch {
            args.push(base.as_str());
        }
    } else {
        args.push(path.as_str());
        if let Some(ref b) = branch {
            args.push(b.as_str());
        }
    }

    let output = runner.run_write(&canonical, &args).await?;
    let stdout_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(stdout_str)
}

#[tauri::command]
pub async fn remove_worktree(
    repo_path: String,
    path: String,
    force: bool,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let mut args = vec!["worktree", "remove"];
    if force {
        args.push("--force");
    }
    args.push(path.as_str());

    let output = runner.run_write(&canonical, &args).await?;
    let stdout_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(stdout_str)
}

fn canonicalize_repo_path(repo_path: &str) -> Result<PathBuf, AppError> {
    let raw = PathBuf::from(repo_path);
    if !raw.exists() {
        return Err(AppError::new(
            ErrorKind::InvalidPath,
            format!("Путь '{repo_path}' не существует"),
            None,
        ));
    }
    raw.canonicalize().map_err(|e| {
        AppError::new(
            ErrorKind::InvalidPath,
            format!("Не удалось канонизировать путь: {e}"),
            None,
        )
    })
}
