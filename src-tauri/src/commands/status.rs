use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{parse_status_porcelain_v2, RepoStatus};
use crate::git::GitRunner;

#[tauri::command]
pub async fn get_status(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<RepoStatus, AppError> {
    let raw_path = PathBuf::from(&repo_path);
    if !raw_path.exists() {
        return Err(AppError::new(
            ErrorKind::InvalidPath,
            format!("Путь '{repo_path}' не существует"),
            None,
        ));
    }

    let canonical = raw_path.canonicalize().map_err(|e| {
        AppError::new(
            ErrorKind::InvalidPath,
            format!("Не удалось канонизировать путь: {e}"),
            None,
        )
    })?;

    let output = runner
        .run_read(
            Some(&canonical),
            &[
                "status",
                "--porcelain=v2",
                "-z",
                "--branch",
                "--untracked-files=normal",
            ],
        )
        .await?;

    Ok(parse_status_porcelain_v2(&output.stdout))
}
