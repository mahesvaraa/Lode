use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::process::Command;
use tokio::time::timeout;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::{AppError, ErrorKind};
use crate::git::queue::RepoQueue;

const READ_TIMEOUT: Duration = Duration::from_secs(30);
const WRITE_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/git_info.ts")]
pub struct GitInfo {
    pub available: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub is_valid_version: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct GitOutput {
    pub stdout: Vec<u8>,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u64,
}

#[derive(Clone)]
pub struct GitRunner {
    git_path: Arc<tokio::sync::RwLock<Option<PathBuf>>>,
    queue: RepoQueue,
}

impl GitRunner {
    pub fn new(queue: RepoQueue) -> Self {
        Self {
            git_path: Arc::new(tokio::sync::RwLock::new(None)),
            queue,
        }
    }

    pub async fn set_custom_git_path(&self, path: Option<PathBuf>) {
        let mut lock = self.git_path.write().await;
        *lock = path;
    }

    pub async fn resolve_git_executable(&self) -> Result<PathBuf, AppError> {
        // 1. Check custom path if configured
        {
            let lock = self.git_path.read().await;
            if let Some(ref path) = *lock {
                if path.is_file() {
                    return Ok(path.clone());
                }
            }
        }

        // 2. Search in PATH
        if let Some(path) = find_in_path("git") {
            return Ok(path);
        }

        // 3. Platform-specific fallbacks (especially for Windows)
        #[cfg(target_os = "windows")]
        {
            let common_locations = [
                r"C:\Program Files\Git\cmd\git.exe",
                r"C:\Program Files\Git\bin\git.exe",
                r"C:\Program Files (x86)\Git\cmd\git.exe",
                r"C:\Program Files (x86)\Git\bin\git.exe",
            ];
            for loc in &common_locations {
                let p = PathBuf::from(loc);
                if p.is_file() {
                    return Ok(p);
                }
            }

            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let p = PathBuf::from(local_app_data)
                    .join("Programs")
                    .join("Git")
                    .join("cmd")
                    .join("git.exe");
                if p.is_file() {
                    return Ok(p);
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let unix_locations = [
                "/usr/bin/git",
                "/usr/local/bin/git",
                "/opt/homebrew/bin/git",
            ];
            for loc in &unix_locations {
                let p = PathBuf::from(loc);
                if p.is_file() {
                    return Ok(p);
                }
            }
        }

        Err(AppError::git_not_found(
            "Git не найден ни в переменной окружения PATH, ни по стандартным путям установки",
        ))
    }

    pub async fn check_git_installation(&self) -> GitInfo {
        let git_path_buf = match self.resolve_git_executable().await {
            Ok(p) => p,
            Err(e) => {
                return GitInfo {
                    available: false,
                    version: None,
                    path: None,
                    is_valid_version: false,
                    error: Some(e.message),
                };
            }
        };

        let path_str = git_path_buf.to_string_lossy().to_string();

        let mut cmd = Command::new(&git_path_buf);
        cmd.arg("--version");
        configure_command_platform(&mut cmd);

        let output = match cmd.output().await {
            Ok(o) => o,
            Err(e) => {
                return GitInfo {
                    available: false,
                    version: None,
                    path: Some(path_str),
                    is_valid_version: false,
                    error: Some(format!("Ошибка запуска git: {e}")),
                };
            }
        };

        let stdout_str = String::from_utf8_lossy(&output.stdout);
        let version_str = parse_git_version(&stdout_str);

        match version_str {
            Some(v) => {
                let valid = is_version_supported(&v, 2, 30);
                GitInfo {
                    available: true,
                    version: Some(v.clone()),
                    path: Some(path_str),
                    is_valid_version: valid,
                    error: if valid {
                        None
                    } else {
                        Some(format!(
                            "Версия Git {v} слишком старая. Требуется версия 2.30.0 или выше."
                        ))
                    },
                }
            }
            None => GitInfo {
                available: false,
                version: None,
                path: Some(path_str),
                is_valid_version: false,
                error: Some(format!("Не удалось распарсить вывод: {stdout_str}")),
            },
        }
    }

    /// Execute a read-only git command
    pub async fn run_read(
        &self,
        repo_path: Option<&Path>,
        args: &[&str],
    ) -> Result<GitOutput, AppError> {
        self.run_inner(repo_path, args, true, READ_TIMEOUT).await
    }

    /// Execute a write git command (guarded by repo mutex)
    pub async fn run_write(
        &self,
        repo_path: &Path,
        args: &[&str],
    ) -> Result<GitOutput, AppError> {
        let lock = self.queue.get_lock(repo_path).await;
        let _guard = lock.lock().await;
        self.run_inner(Some(repo_path), args, false, WRITE_TIMEOUT).await
    }

    async fn run_inner(
        &self,
        repo_path: Option<&Path>,
        args: &[&str],
        is_read: bool,
        timeout_dur: Duration,
    ) -> Result<GitOutput, AppError> {
        let git_bin = self.resolve_git_executable().await?;
        let mut cmd = Command::new(git_bin);

        // Required standard environment variables
        cmd.env("GIT_TERMINAL_PROMPT", "0");
        cmd.env("GIT_PAGER", "cat");
        cmd.env("LC_ALL", "C");
        if is_read {
            cmd.env("GIT_OPTIONAL_LOCKS", "0");
        }

        // Standard configuration flags to guarantee stable machine parsing
        cmd.arg("-c").arg("core.quotepath=false");
        cmd.arg("-c").arg("color.ui=false");

        if let Some(path) = repo_path {
            cmd.current_dir(path);
        }

        for arg in args {
            cmd.arg(arg);
        }

        configure_command_platform(&mut cmd);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let start = Instant::now();

        let child = cmd.spawn().map_err(|e| {
            AppError::new(
                ErrorKind::Io,
                format!("Не удалось запустить процесс git: {e}"),
                None,
            )
        })?;

        let output = match timeout(timeout_dur, child.wait_with_output()).await {
            Ok(res) => res.map_err(|e| {
                AppError::new(
                    ErrorKind::Io,
                    format!("Ошибка чтения вывода git: {e}"),
                    None,
                )
            })?,
            Err(_) => {
                return Err(AppError::new(
                    ErrorKind::Io,
                    format!("Таймаут выполнения команды git ({:?})", timeout_dur),
                    None,
                ));
            }
        };

        let duration_ms = start.elapsed().as_millis() as u64;
        let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);

        if !output.status.success() {
            return Err(AppError::from_git_stderr(&stderr_str, Some(exit_code)));
        }

        Ok(GitOutput {
            stdout: output.stdout,
            stderr: stderr_str,
            exit_code,
            duration_ms,
        })
    }
}

fn find_in_path(binary_name: &str) -> Option<PathBuf> {
    if let Some(paths) = std::env::var_os("PATH") {
        for mut p in std::env::split_paths(&paths) {
            p.push(binary_name);
            if p.is_file() {
                return Some(p);
            }
            #[cfg(target_os = "windows")]
            {
                p.set_extension("exe");
                if p.is_file() {
                    return Some(p);
                }
            }
        }
    }
    None
}

fn configure_command_platform(cmd: &mut Command) {
    #[cfg(target_os = "windows")]
    {
        // CREATE_NO_WINDOW = 0x08000000 to prevent flashing terminal windows
        cmd.creation_flags(0x0800_0000);
    }
    let _ = cmd;
}

pub fn parse_git_version(stdout: &str) -> Option<String> {
    // Examples:
    // "git version 2.45.1.windows.1" -> "2.45.1"
    // "git version 2.39.2 (Apple Git-143)" -> "2.39.2"
    // "git version 2.34.1" -> "2.34.1"
    for part in stdout.split_whitespace() {
        let cleaned = part.trim_matches(|c: char| !c.is_ascii_digit());
        let segments: Vec<&str> = cleaned.split('.').collect();
        let numeric_parts: Vec<&str> = segments
            .into_iter()
            .take_while(|seg| !seg.is_empty() && seg.chars().all(|c| c.is_ascii_digit()))
            .collect();

        if numeric_parts.len() >= 2 {
            return Some(numeric_parts.join("."));
        }
    }
    None
}

pub fn is_version_supported(version_str: &str, min_major: u32, min_minor: u32) -> bool {
    let parts: Vec<u32> = version_str
        .split('.')
        .filter_map(|s| s.parse::<u32>().ok())
        .collect();

    if parts.is_empty() {
        return false;
    }

    let major = parts[0];
    let minor = parts.get(1).copied().unwrap_or(0);

    if major > min_major {
        true
    } else if major == min_major {
        minor >= min_minor
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_git_version() {
        assert_eq!(
            parse_git_version("git version 2.45.1.windows.1"),
            Some("2.45.1".to_string())
        );
        assert_eq!(
            parse_git_version("git version 2.39.2 (Apple Git-143)"),
            Some("2.39.2".to_string())
        );
        assert_eq!(
            parse_git_version("git version 2.30.0"),
            Some("2.30.0".to_string())
        );
    }

    #[test]
    fn test_is_version_supported() {
        assert!(is_version_supported("2.30.0", 2, 30));
        assert!(is_version_supported("2.45.1", 2, 30));
        assert!(is_version_supported("3.0.0", 2, 30));
        assert!(!is_version_supported("2.29.3", 2, 30));
        assert!(!is_version_supported("1.8.0", 2, 30));
    }
}
