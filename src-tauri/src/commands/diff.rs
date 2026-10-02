use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{parse_unified_diff, DiffHunk, DiffLine, DiffLineKind, FileDiff, FileStatusKind};
use crate::git::GitRunner;

#[tauri::command]
pub async fn get_diff(
    repo_path: String,
    file_path: String,
    orig_path: Option<String>,
    staged: bool,
    runner: State<'_, GitRunner>,
) -> Result<FileDiff, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let mut args: Vec<&str> = vec![
        "diff",
        "-M",
        "--no-ext-diff",
        "--no-color",
        "-p",
        "--unified=3",
    ];

    if staged {
        args.push("--cached");
    }

    args.push("--");
    if let Some(ref orig) = orig_path {
        args.push(orig);
    }
    args.push(&file_path);

    let output = runner.run_read(Some(&canonical), &args).await?;

    let parsed_files = parse_unified_diff(&output.stdout);
    if let Some(file_diff) = parsed_files.into_iter().next() {
        return Ok(file_diff);
    }

    // If diff is empty and this is unstaged, check if file is untracked on disk
    if !staged {
        let disk_path = canonical.join(&file_path);
        if disk_path.is_file() {
            return build_untracked_file_diff(&disk_path, &file_path);
        }
    }

    // Default empty diff
    Ok(FileDiff {
        old_path: orig_path,
        new_path: file_path,
        status: FileStatusKind::Modified,
        is_binary: false,
        old_mode: None,
        new_mode: None,
        hunks: Vec::new(),
        total_additions: 0,
        total_deletions: 0,
        is_truncated: false,
        total_lines: 0,
        raw_size_bytes: 0,
    })
}

#[tauri::command]
pub async fn get_commit_diff(
    repo_path: String,
    commit_hash: String,
    file_path: String,
    runner: State<'_, GitRunner>,
) -> Result<FileDiff, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let args = [
        "show",
        "-M",
        "--no-ext-diff",
        "--no-color",
        "-p",
        "--unified=3",
        &commit_hash,
        "--",
        &file_path,
    ];

    let output = runner.run_read(Some(&canonical), &args).await?;
    let parsed_files = parse_unified_diff(&output.stdout);

    if let Some(file_diff) = parsed_files.into_iter().next() {
        Ok(file_diff)
    } else {
        Ok(FileDiff {
            old_path: None,
            new_path: file_path,
            status: FileStatusKind::Modified,
            is_binary: false,
            old_mode: None,
            new_mode: None,
            hunks: Vec::new(),
            total_additions: 0,
            total_deletions: 0,
            is_truncated: false,
            total_lines: 0,
            raw_size_bytes: 0,
        })
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

fn build_untracked_file_diff(disk_path: &Path, file_path: &str) -> Result<FileDiff, AppError> {
    let raw_bytes = fs::read(disk_path).map_err(AppError::from)?;
    let raw_size_bytes = raw_bytes.len();

    // Check if binary (first 8000 bytes contain 0)
    let is_binary = raw_bytes.iter().take(8000).any(|&b| b == 0);

    if is_binary {
        return Ok(FileDiff {
            old_path: None,
            new_path: file_path.to_string(),
            status: FileStatusKind::Untracked,
            is_binary: true,
            old_mode: None,
            new_mode: None,
            hunks: Vec::new(),
            total_additions: 0,
            total_deletions: 0,
            is_truncated: false,
            total_lines: 0,
            raw_size_bytes,
        });
    }

    let content = String::from_utf8_lossy(&raw_bytes);
    let mut lines = Vec::new();
    let mut total_lines = 0;
    let mut is_truncated = false;

    for (idx, line) in content.lines().enumerate() {
        if idx >= 5000 {
            is_truncated = true;
            break;
        }

        let has_crlf = line.ends_with('\r');
        let clean_text = if has_crlf {
            &line[..line.len() - 1]
        } else {
            line
        };

        lines.push(DiffLine {
            kind: DiffLineKind::Addition,
            old_no: None,
            new_no: Some((idx + 1) as u32),
            text: clean_text.to_string(),
            no_eol: false,
            has_crlf,
        });
        total_lines += 1;
    }

    let hunks = vec![DiffHunk {
        old_start: 0,
        old_lines: 0,
        new_start: 1,
        new_lines: total_lines as u32,
        header: String::new(),
        lines,
    }];

    Ok(FileDiff {
        old_path: None,
        new_path: file_path.to_string(),
        status: FileStatusKind::Untracked,
        is_binary: false,
        old_mode: None,
        new_mode: None,
        hunks,
        total_additions: total_lines,
        total_deletions: 0,
        is_truncated,
        total_lines,
        raw_size_bytes,
    })
}
