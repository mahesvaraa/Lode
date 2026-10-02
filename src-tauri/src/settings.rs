use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use ts_rs::TS;

use crate::error::{AppError, ErrorKind};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/settings.ts")]
pub struct AppSettings {
    pub git_path: Option<String>,
    pub recent_repos: Vec<String>,
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            git_path: None,
            recent_repos: Vec::new(),
            theme: "system".to_string(),
        }
    }
}

pub struct SettingsManager {
    config_path: PathBuf,
}

impl SettingsManager {
    pub fn new(app: &AppHandle) -> Result<Self, AppError> {
        let config_dir = app.path().app_config_dir().map_err(|e| {
            AppError::new(
                ErrorKind::Io,
                format!("Не удалось получить каталог конфигурации: {e}"),
                None,
            )
        })?;

        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).map_err(|e| {
                AppError::new(
                    ErrorKind::Io,
                    format!("Не удалось создать каталог конфигурации: {e}"),
                    None,
                )
            })?;
        }

        let config_path = config_dir.join("settings.json");
        Ok(Self { config_path })
    }

    pub fn load(&self) -> AppSettings {
        if !self.config_path.exists() {
            return AppSettings::default();
        }

        match fs::read_to_string(&self.config_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => AppSettings::default(),
        }
    }

    pub fn save(&self, settings: &AppSettings) -> Result<(), AppError> {
        let json = serde_json::to_string_pretty(settings).map_err(|e| {
            AppError::new(
                ErrorKind::Io,
                format!("Не удалось сериализовать настройки: {e}"),
                None,
            )
        })?;

        fs::write(&self.config_path, json).map_err(|e| {
            AppError::new(
                ErrorKind::Io,
                format!("Не удалось сохранить настройки: {e}"),
                None,
            )
        })?;

        Ok(())
    }

    pub fn add_recent_repo(&self, repo_path: &str) -> Result<AppSettings, AppError> {
        let mut settings = self.load();
        
        let path = Path::new(repo_path);
        let canonical_str = path
            .canonicalize()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| repo_path.to_string());

        // Remove existing entry if present
        settings.recent_repos.retain(|p| p != &canonical_str);
        // Prepend to front
        settings.recent_repos.insert(0, canonical_str);

        // Keep at most 10 recent repos
        if settings.recent_repos.len() > 10 {
            settings.recent_repos.truncate(10);
        }

        self.save(&settings)?;
        Ok(settings)
    }

    pub fn remove_recent_repo(&self, repo_path: &str) -> Result<AppSettings, AppError> {
        let mut settings = self.load();
        settings.recent_repos.retain(|p| p != repo_path);
        self.save(&settings)?;
        Ok(settings)
    }

    pub fn set_theme(&self, theme: &str) -> Result<AppSettings, AppError> {
        let mut settings = self.load();
        settings.theme = theme.to_string();
        self.save(&settings)?;
        Ok(settings)
    }

    pub fn set_git_path(&self, git_path: Option<String>) -> Result<AppSettings, AppError> {
        let mut settings = self.load();
        settings.git_path = git_path;
        self.save(&settings)?;
        Ok(settings)
    }
}
