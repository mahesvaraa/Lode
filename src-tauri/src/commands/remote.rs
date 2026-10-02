use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{parse_git_remotes, PullMode, Remote};
use crate::git::GitRunner;

#[tauri::command]
pub async fn list_remotes(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<Vec<Remote>, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let output = runner.run_read(Some(&canonical), &["remote", "-v"]).await?;
    Ok(parse_git_remotes(&output.stdout))
}

#[tauri::command]
pub async fn add_remote(
    repo_path: String,
    name: String,
    url: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner
        .run_write(&canonical, &["remote", "add", "--", &name, &url])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn remove_remote(
    repo_path: String,
    name: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner
        .run_write(&canonical, &["remote", "remove", "--", &name])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn rename_remote(
    repo_path: String,
    old_name: String,
    new_name: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner
        .run_write(&canonical, &["remote", "rename", "--", &old_name, &new_name])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn set_remote_url(
    repo_path: String,
    name: String,
    url: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner
        .run_write(&canonical, &["remote", "set-url", "--", &name, &url])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn fetch_all(
    repo_path: String,
    prune: bool,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let mut args = vec!["fetch", "--all"];
    if prune {
        args.push("--prune");
    }

    let out = runner.run_remote(&canonical, &args).await?;
    let summary = if !out.stderr.trim().is_empty() {
        out.stderr
    } else {
        String::from_utf8_lossy(&out.stdout).to_string()
    };
    Ok(summary)
}

#[tauri::command]
pub async fn pull(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
    mode: Option<PullMode>,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let mut args = vec!["pull"];
    match mode.unwrap_or(PullMode::FfOnly) {
        PullMode::FfOnly => args.push("--ff-only"),
        PullMode::Merge => args.push("--no-rebase"),
        PullMode::Rebase => args.push("--rebase"),
    }

    let r_name;
    let b_name;
    if let (Some(r), Some(b)) = (remote, branch) {
        if !r.trim().is_empty() && !b.trim().is_empty() {
            r_name = r;
            b_name = b;
            args.push("--");
            args.push(&r_name);
            args.push(&b_name);
        }
    }

    let out = runner.run_remote(&canonical, &args).await?;
    let summary = if !out.stderr.trim().is_empty() {
        out.stderr
    } else {
        String::from_utf8_lossy(&out.stdout).to_string()
    };
    Ok(summary)
}

#[tauri::command]
pub async fn push(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
    set_upstream: bool,
    force_with_lease: bool,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let mut args = vec!["push"];
    if set_upstream {
        args.push("-u");
    }
    if force_with_lease {
        args.push("--force-with-lease");
    }

    let r_name;
    let b_name;
    if let (Some(r), Some(b)) = (remote, branch) {
        if !r.trim().is_empty() && !b.trim().is_empty() {
            r_name = r;
            b_name = b;
            args.push("--");
            args.push(&r_name);
            args.push(&b_name);
        }
    }

    let out = runner.run_remote(&canonical, &args).await?;
    let summary = if !out.stderr.trim().is_empty() {
        out.stderr
    } else {
        String::from_utf8_lossy(&out.stdout).to_string()
    };
    Ok(summary)
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
