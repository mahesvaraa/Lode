use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{parse_git_refs, RepoRefs};
use crate::git::state::{detect_repo_state, RepoState};
use crate::git::GitRunner;

const REFS_FORMAT: &str =
    "--format=%(refname)\t%(objectname)\t%(upstream:short)\t%(upstream:track)\t%(HEAD)\t%(creatordate:unix)\t%(*objectname)";

#[tauri::command]
pub async fn get_refs(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<RepoRefs, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let args = [
        "for-each-ref",
        REFS_FORMAT,
        "refs/heads",
        "refs/remotes",
        "refs/tags",
    ];
    let output = runner.run_read(Some(&canonical), &args).await?;
    Ok(parse_git_refs(&output.stdout))
}

#[tauri::command]
pub async fn get_repo_state(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<RepoState, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    detect_repo_state(&runner, &canonical).await
}

#[tauri::command]
pub async fn create_branch(
    repo_path: String,
    name: String,
    start_point: Option<String>,
    switch_to: bool,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    validate_branch_name(&runner, &canonical, &name).await?;

    if switch_to {
        let mut args = vec!["switch", "-c", &name];
        if let Some(ref start) = start_point {
            args.push("--");
            args.push(start);
        }
        runner.run_write(&canonical, &args).await?;
    } else {
        let mut args = vec!["branch", "--", &name];
        if let Some(ref start) = start_point {
            args.push(start);
        }
        runner.run_write(&canonical, &args).await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn switch_branch(
    repo_path: String,
    name: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner.run_write(&canonical, &["switch", "--", &name]).await?;
    Ok(())
}

#[tauri::command]
pub async fn rename_branch(
    repo_path: String,
    old_name: String,
    new_name: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    validate_branch_name(&runner, &canonical, &new_name).await?;
    runner
        .run_write(&canonical, &["branch", "-m", "--", &old_name, &new_name])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_branch(
    repo_path: String,
    name: String,
    force: bool,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let flag = if force { "-D" } else { "-d" };
    runner.run_write(&canonical, &["branch", flag, "--", &name]).await?;
    Ok(())
}

#[tauri::command]
pub async fn create_tag(
    repo_path: String,
    name: String,
    target_hash: Option<String>,
    message: Option<String>,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let mut args = Vec::new();
    args.push("tag");

    let msg_str;
    if let Some(ref msg) = message {
        if !msg.trim().is_empty() {
            msg_str = msg.clone();
            args.push("-a");
            args.push("-m");
            args.push(&msg_str);
        }
    }

    args.push("--");
    args.push(&name);

    if let Some(ref target) = target_hash {
        args.push(target);
    }

    runner.run_write(&canonical, &args).await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_tag(
    repo_path: String,
    name: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner.run_write(&canonical, &["tag", "-d", "--", &name]).await?;
    Ok(())
}

#[tauri::command]
pub async fn merge_branch(
    repo_path: String,
    branch_or_ref: String,
    no_ff: bool,
    runner: State<'_, GitRunner>,
) -> Result<RepoState, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let mut args = vec!["merge"];
    if no_ff {
        args.push("--no-ff");
    }
    args.push("--");
    args.push(&branch_or_ref);

    // Merge may fail with conflict (exit code 1)
    let merge_res = runner.run_write(&canonical, &args).await;

    // In both success and conflict cases, detect current repo state
    let state = detect_repo_state(&runner, &canonical).await?;

    if let Err(err) = merge_res {
        if state.kind != crate::git::state::RepoStateKind::Normal {
            // Conflict or ongoing merge state detected: return state rather than blowing up
            return Ok(state);
        }
        return Err(err);
    }

    Ok(state)
}

#[tauri::command]
pub async fn abort_merge(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<RepoState, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner.run_write(&canonical, &["merge", "--abort"]).await?;
    detect_repo_state(&runner, &canonical).await
}

async fn validate_branch_name(
    runner: &GitRunner,
    repo_path: &std::path::Path,
    name: &str,
) -> Result<(), AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::new(
            ErrorKind::InvalidBranchName,
            "Имя ветки не может быть пустым",
            None,
        ));
    }

    let out = runner
        .run_read(
            Some(repo_path),
            &["check-ref-format", "--branch", trimmed],
        )
        .await;

    match out {
        Ok(_) => Ok(()),
        Err(_) => Err(AppError::new(
            ErrorKind::InvalidBranchName,
            format!("Недопустимое имя ветки: '{trimmed}'"),
            None,
        )),
    }
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
