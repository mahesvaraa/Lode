use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{parse_commit_files, parse_git_log, Commit, CommitDetails};
use crate::git::GitRunner;

const LOG_FORMAT: &str =
    "--format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%ce%x1f%ct%x1f%D%x1f%s%x1f%b";

#[tauri::command]
pub async fn get_commits(
    repo_path: String,
    skip: usize,
    limit: usize,
    branch: Option<String>,
    search: Option<String>,
    runner: State<'_, GitRunner>,
) -> Result<Vec<Commit>, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let limit_str = limit.to_string();
    let skip_str = skip.to_string();

    let mut args: Vec<&str> = vec![
        "log",
        "-z",
        "--date-order",
        LOG_FORMAT,
        "-n",
        &limit_str,
        "--skip",
        &skip_str,
    ];

    let grep_arg;
    if let Some(ref q) = search {
        if !q.trim().is_empty() {
            grep_arg = format!("--grep={}", q.trim());
            args.push(&grep_arg);
        }
    }

    if let Some(ref b) = branch {
        if !b.trim().is_empty() && b != "ALL" {
            args.push(b.trim());
        } else {
            args.push("--all");
        }
    } else {
        args.push("--all");
    }

    let output = runner.run_read(Some(&canonical), &args).await?;
    Ok(parse_git_log(&output.stdout))
}

#[tauri::command]
pub async fn get_commit_details(
    repo_path: String,
    hash: String,
    runner: State<'_, GitRunner>,
) -> Result<CommitDetails, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    // 1. Fetch single commit header
    let log_args = ["log", "-z", "-1", LOG_FORMAT, &hash];
    let log_out = runner.run_read(Some(&canonical), &log_args).await?;
    let commits = parse_git_log(&log_out.stdout);
    let commit = commits.into_iter().next().ok_or_else(|| {
        AppError::new(
            ErrorKind::Unknown,
            format!("Коммит {hash} не найден"),
            None,
        )
    })?;

    // 2. Fetch changed files in commit (supports regular, root, and merge/octopus commits)
    let files_args = [
        "diff-tree",
        "-r",
        "--name-status",
        "-z",
        "--no-commit-id",
        "--root",
        "-m",
        "--first-parent",
        &hash,
    ];
    let files_out = runner.run_read(Some(&canonical), &files_args).await?;
    let files = parse_commit_files(&files_out.stdout);

    Ok(CommitDetails { commit, files })
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
