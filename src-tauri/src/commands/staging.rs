use std::path::PathBuf;
use tauri::State;

use crate::commands::diff::get_diff;
use crate::error::{AppError, ErrorKind};
use crate::git::patch::build_hunk_patch;
use crate::git::GitRunner;

#[tauri::command]
pub async fn stage_file(
    repo_path: String,
    path: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner
        .run_write(&canonical, &["add", "-A", "--", &path])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn unstage_file(
    repo_path: String,
    path: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let res = runner
        .run_write(&canonical, &["restore", "--staged", "--", &path])
        .await;

    if let Err(err) = res {
        // In repository without initial commit, restore fails; fallback to git rm --cached
        if err.message.contains("could not resolve HEAD") || err.message.contains("fatal: could not resolve HEAD") {
            runner
                .run_write(&canonical, &["rm", "--cached", "-r", "--", &path])
                .await?;
            return Ok(());
        }
        return Err(err);
    }

    Ok(())
}

#[tauri::command]
pub async fn stage_all(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner.run_write(&canonical, &["add", "-A"]).await?;
    Ok(())
}

#[tauri::command]
pub async fn unstage_all(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let res = runner
        .run_write(&canonical, &["restore", "--staged", ":"])
        .await;

    if let Err(err) = res {
        if err.message.contains("could not resolve HEAD") || err.message.contains("fatal: could not resolve HEAD") {
            runner
                .run_write(&canonical, &["rm", "--cached", "-r", "."])
                .await?;
            return Ok(());
        }
        return Err(err);
    }

    Ok(())
}

#[tauri::command]
pub async fn stage_hunk(
    repo_path: String,
    path: String,
    hunk_index: usize,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    // If file is untracked, mark it intent-to-add so diff generates hunks
    ensure_intent_to_add(&canonical, &path, &runner).await?;

    let file_diff = get_diff(repo_path.clone(), path.clone(), None, false, runner.clone()).await?;
    if hunk_index >= file_diff.hunks.len() {
        return Err(AppError::new(
            ErrorKind::Unknown,
            format!("Hunk index {hunk_index} не найден"),
            None,
        ));
    }

    let all_indices: Vec<usize> = (0..file_diff.hunks[hunk_index].lines.len()).collect();
    let patch = build_hunk_patch(&file_diff, hunk_index, &all_indices).map_err(|e| {
        AppError::new(ErrorKind::Unknown, e, None)
    })?;

    runner
        .run_write_stdin(&canonical, &["apply", "--cached", "--recount", "-"], &patch)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn unstage_hunk(
    repo_path: String,
    path: String,
    hunk_index: usize,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let file_diff = get_diff(repo_path.clone(), path.clone(), None, true, runner.clone()).await?;
    if hunk_index >= file_diff.hunks.len() {
        return Err(AppError::new(
            ErrorKind::Unknown,
            format!("Hunk index {hunk_index} не найден"),
            None,
        ));
    }

    let all_indices: Vec<usize> = (0..file_diff.hunks[hunk_index].lines.len()).collect();
    let patch = build_hunk_patch(&file_diff, hunk_index, &all_indices).map_err(|e| {
        AppError::new(ErrorKind::Unknown, e, None)
    })?;

    runner
        .run_write_stdin(
            &canonical,
            &["apply", "--cached", "--reverse", "--recount", "-"],
            &patch,
        )
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn stage_lines(
    repo_path: String,
    path: String,
    hunk_index: usize,
    line_indices: Vec<usize>,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    ensure_intent_to_add(&canonical, &path, &runner).await?;

    let file_diff = get_diff(repo_path.clone(), path.clone(), None, false, runner.clone()).await?;
    let patch = build_hunk_patch(&file_diff, hunk_index, &line_indices).map_err(|e| {
        AppError::new(ErrorKind::Unknown, e, None)
    })?;

    runner
        .run_write_stdin(&canonical, &["apply", "--cached", "--recount", "-"], &patch)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn unstage_lines(
    repo_path: String,
    path: String,
    hunk_index: usize,
    line_indices: Vec<usize>,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let file_diff = get_diff(repo_path.clone(), path.clone(), None, true, runner.clone()).await?;
    let patch = build_hunk_patch(&file_diff, hunk_index, &line_indices).map_err(|e| {
        AppError::new(ErrorKind::Unknown, e, None)
    })?;

    runner
        .run_write_stdin(
            &canonical,
            &["apply", "--cached", "--reverse", "--recount", "-"],
            &patch,
        )
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn discard_lines(
    repo_path: String,
    path: String,
    hunk_index: usize,
    line_indices: Vec<usize>,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let file_diff = get_diff(repo_path.clone(), path.clone(), None, false, runner.clone()).await?;
    let patch = build_hunk_patch(&file_diff, hunk_index, &line_indices).map_err(|e| {
        AppError::new(ErrorKind::Unknown, e, None)
    })?;

    runner
        .run_write_stdin(&canonical, &["apply", "--reverse", "--recount", "-"], &patch)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn discard_file(
    repo_path: String,
    path: String,
    is_untracked: bool,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    if is_untracked {
        runner
            .run_write(&canonical, &["clean", "-f", "--", &path])
            .await?;
    } else {
        runner
            .run_write(&canonical, &["restore", "--", &path])
            .await?;
    }

    Ok(())
}

async fn ensure_intent_to_add(
    repo_path: &std::path::Path,
    path: &str,
    runner: &GitRunner,
) -> Result<(), AppError> {
    let disk_file = repo_path.join(path);
    if disk_file.is_file() {
        // If file is untracked, git add -N marks it intent-to-add
        let _ = runner.run_write(repo_path, &["add", "-N", "--", path]).await;
    }
    Ok(())
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
