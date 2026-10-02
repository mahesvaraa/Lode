use std::fs;
use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::conflict::{contains_conflict_markers, parse_conflict_content, ParsedConflictFile};
use crate::git::state::{detect_repo_state, RepoState, RepoStateKind};
use crate::git::GitRunner;

#[tauri::command]
pub async fn get_conflict_file(
    repo_path: String,
    path: String,
    _runner: State<'_, GitRunner>,
) -> Result<ParsedConflictFile, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let file_path = canonical.join(&path);

    if !file_path.exists() {
        return Err(AppError::new(
            ErrorKind::InvalidPath,
            format!("Файл '{path}' не существует"),
            None,
        ));
    }

    let bytes = fs::read(&file_path).map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось прочитать файл '{path}': {e}"),
            None,
        )
    })?;

    let content = String::from_utf8_lossy(&bytes);
    Ok(parse_conflict_content(&path, &content))
}

#[tauri::command]
pub async fn resolve_conflict_file(
    repo_path: String,
    path: String,
    content: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let target_path = canonical.join(&path);

    // Rule 9.4: Check that there are NO leftover conflict markers!
    if contains_conflict_markers(&content) {
        return Err(AppError::new(
            ErrorKind::Conflict,
            "Файл содержит неразрешённые маркеры конфликта. Удалите все маркеры перед сохранением.",
            None,
        ));
    }

    // Atomic write: write to temp file next to target, then rename
    let parent = target_path.parent().unwrap_or(&canonical);
    let tmp_file_name = format!(
        ".{}.lode-tmp-{}",
        target_path.file_name().and_then(|n| n.to_str()).unwrap_or("tmp"),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    );
    let tmp_path = parent.join(tmp_file_name);

    fs::write(&tmp_path, content.as_bytes()).map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось записать во временный файл: {e}"),
            None,
        )
    })?;

    // Atomic rename
    fs::rename(&tmp_path, &target_path).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось атомарно заменить файл '{path}': {e}"),
            None,
        )
    })?;

    // Stage resolved file: git add -- <path>
    runner.run_write(&canonical, &["add", "--", &path]).await?;
    Ok(())
}

#[tauri::command]
pub async fn resolve_conflict_choice(
    repo_path: String,
    path: String,
    choice: String,
    runner: State<'_, GitRunner>,
) -> Result<(), AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    match choice.as_str() {
        "ours" => {
            runner
                .run_write(&canonical, &["checkout", "--ours", "--", &path])
                .await?;
            runner.run_write(&canonical, &["add", "--", &path]).await?;
        }
        "theirs" => {
            runner
                .run_write(&canonical, &["checkout", "--theirs", "--", &path])
                .await?;
            runner.run_write(&canonical, &["add", "--", &path]).await?;
        }
        "delete" => {
            runner
                .run_write(&canonical, &["rm", "-f", "--", &path])
                .await?;
        }
        "keep" => {
            runner.run_write(&canonical, &["add", "--", &path]).await?;
        }
        other => {
            return Err(AppError::new(
                ErrorKind::Unknown,
                format!("Неизвестный выбор разрешения конфликта: {other}"),
                None,
            ));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn regenerate_conflict_diff3(
    repo_path: String,
    path: String,
    runner: State<'_, GitRunner>,
) -> Result<ParsedConflictFile, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    runner
        .run_write(&canonical, &["checkout", "--conflict=diff3", "--", &path])
        .await?;

    let file_path = canonical.join(&path);
    let bytes = fs::read(&file_path).map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось прочитать перегенерированный файл '{path}': {e}"),
            None,
        )
    })?;

    let content = String::from_utf8_lossy(&bytes);
    Ok(parse_conflict_content(&path, &content))
}

#[tauri::command]
pub async fn continue_operation(
    repo_path: String,
    message: Option<String>,
    runner: State<'_, GitRunner>,
) -> Result<RepoState, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let state = detect_repo_state(&runner, &canonical).await?;

    match state.kind {
        RepoStateKind::Merge => {
            if let Some(msg) = message {
                runner
                    .run_write_stdin(&canonical, &["commit", "-F", "-"], msg.as_bytes())
                    .await?;
            } else {
                runner
                    .run_write(&canonical, &["commit", "--no-edit"])
                    .await?;
            }
        }
        RepoStateKind::Rebase => {
            runner.run_write(&canonical, &["rebase", "--continue"]).await?;
        }
        RepoStateKind::CherryPick => {
            runner
                .run_write(&canonical, &["cherry-pick", "--continue"])
                .await?;
        }
        RepoStateKind::Revert => {
            runner.run_write(&canonical, &["revert", "--continue"]).await?;
        }
        RepoStateKind::Normal | RepoStateKind::Bisect => {
            return Err(AppError::new(
                ErrorKind::Unknown,
                "Нет активной операции слияния или перебазирования для продолжения",
                None,
            ));
        }
    }

    detect_repo_state(&runner, &canonical).await
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
