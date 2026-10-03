use std::path::Path;
use std::process::Command;
use crate::error::{AppError, ErrorKind};

#[tauri::command]
pub async fn show_in_file_manager(path: String) -> Result<(), AppError> {
    let target = Path::new(&path);
    if !target.exists() {
        return Err(AppError::new(
            ErrorKind::InvalidPath,
            format!("Путь '{}' не существует на диске", path),
            None,
        ));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let mut cmd = Command::new("explorer");
        if target.is_file() {
            cmd.arg(format!("/select,{}", target.display()));
        } else {
            cmd.arg(target.display().to_string());
        }
        cmd.creation_flags(CREATE_NO_WINDOW);
        let _ = cmd.spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let mut cmd = Command::new("open");
        if target.is_file() {
            cmd.arg("-R").arg(target);
        } else {
            cmd.arg(target);
        }
        let _ = cmd.spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let parent = if target.is_file() {
            target.parent().unwrap_or(target)
        } else {
            target
        };
        let _ = Command::new("xdg-open").arg(parent).spawn();
    }

    Ok(())
}

#[tauri::command]
pub async fn open_in_terminal(path: String) -> Result<(), AppError> {
    let target = Path::new(&path);
    let dir = if target.is_file() {
        target.parent().unwrap_or(target)
    } else {
        target
    };

    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("cmd")
            .args(["/c", "start", "wt", "-d", &dir.display().to_string()])
            .spawn()
            .or_else(|_| {
                Command::new("cmd")
                    .args(["/c", "start", "powershell", "-NoExit", "-Command", &format!("Set-Location '{}'", dir.display())])
                    .spawn()
            });
    }

    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open").args(["-a", "Terminal", &dir.display().to_string()]).spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = Command::new("x-terminal-emulator")
            .arg(format!("--working-directory={}", dir.display()))
            .spawn();
    }

    Ok(())
}

#[tauri::command]
pub async fn open_in_external_editor(repo_path: String, path: String) -> Result<(), AppError> {
    let full_path = Path::new(&repo_path).join(&path);
    if !full_path.exists() {
        return Err(AppError::new(
            ErrorKind::InvalidPath,
            format!("Файл '{}' не найден", full_path.display()),
            None,
        ));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let _ = Command::new("cmd")
            .args(["/c", "start", "", &full_path.display().to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open").arg(&full_path).spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = Command::new("xdg-open").arg(&full_path).spawn();
    }

    Ok(())
}
