use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{parse_submodule_status, SubmoduleInfo};
use crate::git::GitRunner;

#[tauri::command]
pub async fn get_submodules(
    repo_path: String,
    runner: State<'_, GitRunner>,
) -> Result<Vec<SubmoduleInfo>, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let output = runner
        .run_read(Some(&canonical), &["submodule", "status", "--recursive"])
        .await?;

    Ok(parse_submodule_status(&output.stdout))
}

#[tauri::command]
pub async fn update_submodules(
    repo_path: String,
    init: bool,
    recursive: bool,
    path: Option<String>,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let mut args = vec!["submodule", "update"];
    if init {
        args.push("--init");
    }
    if recursive {
        args.push("--recursive");
    }
    if let Some(ref p) = path {
        args.push("--");
        args.push(p.as_str());
    }

    let output = runner.run_write(&canonical, &args).await?;
    let stdout_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(stdout_str)
}

#[tauri::command]
pub async fn init_submodule(
    repo_path: String,
    path: Option<String>,
    runner: State<'_, GitRunner>,
) -> Result<String, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    let mut args = vec!["submodule", "init"];
    if let Some(ref p) = path {
        args.push("--");
        args.push(p.as_str());
    }

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
