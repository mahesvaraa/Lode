use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../src/api/types/error_kind.ts")]
pub enum ErrorKind {
    Conflict,
    DirtyWorkingTree,
    AuthFailed,
    NotARepo,
    LockFile,
    NetworkUnavailable,
    GitNotFound,
    GitVersionTooOld,
    InvalidPath,
    Io,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, Error, TS)]
#[error("{message}")]
#[ts(export, export_to = "../../src/api/types/app_error.ts")]
pub struct AppError {
    pub kind: ErrorKind,
    pub message: String,
    pub details: Option<String>,
}

impl AppError {
    pub fn new(kind: ErrorKind, message: impl Into<String>, details: Option<String>) -> Self {
        Self {
            kind,
            message: message.into(),
            details,
        }
    }

    pub fn not_a_repo(path: &str) -> Self {
        Self::new(
            ErrorKind::NotARepo,
            format!("Каталог '{path}' не является Git-репозиторием"),
            None,
        )
    }

    pub fn git_not_found(details: impl Into<String>) -> Self {
        Self::new(
            ErrorKind::GitNotFound,
            "Git не найден в системе",
            Some(details.into()),
        )
    }

    pub fn git_version_too_old(version: &str) -> Self {
        Self::new(
            ErrorKind::GitVersionTooOld,
            format!("Требуется Git версии 2.30.0 или новее. Установлена: {version}"),
            None,
        )
    }

    pub fn from_git_stderr(stderr: &str, exit_code: Option<i32>) -> Self {
        let trimmed = stderr.trim();
        let kind = if trimmed.contains("CONFLICT") || trimmed.contains("conflict") {
            ErrorKind::Conflict
        } else if trimmed.contains("Changes to be committed") || trimmed.contains("Your local changes") {
            ErrorKind::DirtyWorkingTree
        } else if trimmed.contains("Authentication failed") || trimmed.contains("Permission denied (publickey)") {
            ErrorKind::AuthFailed
        } else if trimmed.contains("not a git repository") {
            ErrorKind::NotARepo
        } else if trimmed.contains("index.lock") {
            ErrorKind::LockFile
        } else if trimmed.contains("Could not resolve host") || trimmed.contains("Network is unreachable") {
            ErrorKind::NetworkUnavailable
        } else {
            ErrorKind::Unknown
        };

        let message = if let Some(first_line) = trimmed.lines().next() {
            if let Some(msg) = first_line.strip_prefix("fatal: ") {
                msg.to_string()
            } else if let Some(msg) = first_line.strip_prefix("error: ") {
                msg.to_string()
            } else {
                first_line.to_string()
            }
        } else {
            format!("Git завершился с кодом {:?}", exit_code)
        };

        Self {
            kind,
            message,
            details: if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            },
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        Self::new(ErrorKind::Io, err.to_string(), None)
    }
}
