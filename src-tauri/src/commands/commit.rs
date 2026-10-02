use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::GitRunner;

#[tauri::command]
pub async fn create_commit(
    repo_path: String,
    message: String,
    amend: bool,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    if message.trim().is_empty() {
        return Err(AppError::new(
            ErrorKind::Unknown,
            "Сообщение коммита не может быть пустым".to_string(),
            None,
        ));
    }

    let args: Vec<&str> = if amend {
        vec!["commit", "--amend", "-F", "-"]
    } else {
        vec!["commit", "-F", "-"]
    };

    let output = runner
        .run_write_stdin(&canonical, &args, message.as_bytes())
        .await?;

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
