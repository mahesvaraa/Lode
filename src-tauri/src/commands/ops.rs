use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{
    parse_git_blame_porcelain, parse_git_log, parse_git_stash_list, BlameLine, Commit, StashItem,
};
use crate::git::GitRunner;

#[tauri::command]
pub async fn list_stashes(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<Vec<StashItem>, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let output = runner
        .run_read(
            Some(&canonical),
            &["stash", "list", "--format=%gd%x1f%H%x1f%at%x1f%gs%x00"],
        )
        .await?;
    Ok(parse_git_stash_list(&output.stdout))
}

#[tauri::command]
pub async fn stash_save(
    repo_path: String,
    message: Option<String>,
    include_untracked: bool,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let mut args = vec!["stash", "push"];
    if include_untracked {
        args.push("-u");
    }

    let msg_str;
    if let Some(msg) = message {
        if !msg.trim().is_empty() {
            msg_str = msg;
            args.push("-m");
            args.push(&msg_str);
        }
    }

    let out = runner.run_write(&canonical, &args).await?;
    let summary = if !out.stderr.trim().is_empty() {
        out.stderr
    } else {
        String::from_utf8_lossy(&out.stdout).to_string()
    };
    Ok(summary)
}

#[tauri::command]
pub async fn stash_apply(
    repo_path: String,
    selector: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner
        .run_write(&canonical, &["stash", "apply", "--", &selector])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn stash_pop(
    repo_path: String,
    selector: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner
        .run_write(&canonical, &["stash", "pop", "--", &selector])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn stash_drop(
    repo_path: String,
    selector: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner
        .run_write(&canonical, &["stash", "drop", "--", &selector])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn stash_show_diff(
    repo_path: String,
    selector: String,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let out = runner
        .run_read(Some(&canonical), &["stash", "show", "-p", "--", &selector])
        .await?;
    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}

#[tauri::command]
pub async fn cherry_pick(
    repo_path: String,
    commit_hash: String,
    parent_number: Option<u32>,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let mut args = vec!["cherry-pick"];
    let parent_str;
    if let Some(parent) = parent_number {
        parent_str = parent.to_string();
        args.push("-m");
        args.push(&parent_str);
    }
    args.push("--");
    args.push(&commit_hash);

    runner.run_write(&canonical, &args).await?;
    Ok(())
}

#[tauri::command]
pub async fn revert_commit(
    repo_path: String,
    commit_hash: String,
    parent_number: Option<u32>,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let mut args = vec!["revert", "--no-edit"];
    let parent_str;
    if let Some(parent) = parent_number {
        parent_str = parent.to_string();
        args.push("-m");
        args.push(&parent_str);
    }
    args.push("--");
    args.push(&commit_hash);

    runner.run_write(&canonical, &args).await?;
    Ok(())
}

#[tauri::command]
pub async fn reset_repo(
    repo_path: String,
    target_ref: String,
    mode: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let flag = match mode.as_str() {
        "soft" => "--soft",
        "hard" => "--hard",
        _ => "--mixed",
    };

    runner
        .run_write(&canonical, &["reset", flag, "--", &target_ref])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn get_blame(
    repo_path: String,
    path: String,
    runner: State<'_, GitRunner>,
) -> Result<Vec<BlameLine>, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let out = runner
        .run_read(Some(&canonical), &["blame", "--porcelain", "--", &path])
        .await?;
    Ok(parse_git_blame_porcelain(&out.stdout))
}

#[tauri::command]
pub async fn get_file_history(
    repo_path: String,
    path: String,
    limit: Option<u32>,
    runner: State<'_, GitRunner>,
) -> Result<Vec<Commit>, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let format = "--format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%ce%x1f%ct%x1f%D%x1f%s%x1f%b";
    let limit_val = limit.unwrap_or(100).to_string();

    let out = runner
        .run_read(
            Some(&canonical),
            &[
                "log",
                "-z",
                "--date-order",
                format,
                "--follow",
                "-n",
                &limit_val,
                "--",
                &path,
            ],
        )
        .await?;

    Ok(parse_git_log(&out.stdout))
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
