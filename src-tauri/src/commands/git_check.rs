use std::path::PathBuf;
use tauri::State;

use crate::error::AppError;
use crate::git::{GitInfo, GitRunner};
use crate::settings::{AppSettings, SettingsManager};

#[tauri::command]
pub async fn check_git(runner: State<'_, GitRunner>) -> Result<GitInfo, AppError> {
    Ok(runner.check_git_installation().await)
}

#[tauri::command]
pub async fn set_custom_git_path(
    path: Option<String>,
    runner: State<'_, GitRunner>,
    settings: State<'_, SettingsManager>,
) -> Result<GitInfo, AppError> {
    let path_buf = path.as_ref().map(PathBuf::from);
    runner.set_custom_git_path(path_buf).await;
    let _ = settings.set_git_path(path);
    Ok(runner.check_git_installation().await)
}

#[tauri::command]
pub async fn get_settings(settings: State<'_, SettingsManager>) -> Result<AppSettings, AppError> {
    Ok(settings.load())
}

#[tauri::command]
pub async fn save_theme(
    theme: String,
    settings: State<'_, SettingsManager>,
) -> Result<AppSettings, AppError> {
    settings.set_theme(&theme)
}

#[tauri::command]
pub async fn remove_recent_repo(
    path: String,
    settings: State<'_, SettingsManager>,
) -> Result<AppSettings, AppError> {
    settings.remove_recent_repo(&path)
}
