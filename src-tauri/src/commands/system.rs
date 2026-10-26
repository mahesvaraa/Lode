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

        let mut clean_path = path.replace('/', "\\");
        if let Some(stripped) = clean_path.strip_prefix(r"\\?\") {
            clean_path = stripped.to_string();
        }

        let mut cmd = Command::new("explorer");
        if target.is_file() {
            cmd.raw_arg(format!("/select,\"{clean_path}\""));
        } else {
            cmd.raw_arg(format!("\"{clean_path}\""));
        }
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
        let clean_dir = dir.to_string_lossy().replace('/', "\\");
        let _ = Command::new("cmd")
            .args(["/c", "start", "wt", "-d", &clean_dir])
            .spawn()
            .or_else(|_| {
                Command::new("cmd")
                    .args(["/c", "start", "powershell", "-NoExit", "-Command", &format!("Set-Location -LiteralPath '{}'", clean_dir)])
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

        let clean_full = full_path.to_string_lossy().replace('/', "\\");
        let _ = Command::new("cmd")
            .args(["/c", "start", "", &clean_full])
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

fn to_base64(data: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0];
        let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };

        result.push(TABLE[(b0 >> 2) as usize] as char);
        result.push(TABLE[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);

        if chunk.len() > 1 {
            result.push(TABLE[(((b1 & 0x0f) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            result.push('=');
        }

        if chunk.len() > 2 {
            result.push(TABLE[(b2 & 0x3f) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

fn resolve_font_path(path: &str) -> std::path::PathBuf {
    #[cfg(windows)]
    {
        let mut clean = path.replace('/', "\\");
        if let Some(stripped) = clean.strip_prefix(r"\\?\") {
            clean = stripped.to_string();
        }
        std::path::PathBuf::from(clean)
    }
    #[cfg(not(windows))]
    {
        std::path::PathBuf::from(path)
    }
}

#[tauri::command]
pub async fn load_font_bytes(path: String) -> Result<Vec<u8>, AppError> {
    let target = resolve_font_path(&path);
    if !target.exists() || !target.is_file() {
        return Err(AppError::new(
            ErrorKind::InvalidPath,
            format!("Файл шрифта '{}' не найден", path),
            None,
        ));
    }

    let bytes = std::fs::read(&target).map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось прочитать файл шрифта: {e}"),
            None,
        )
    })?;

    Ok(bytes)
}

#[tauri::command]
pub async fn load_font_data(path: String) -> Result<String, AppError> {
    let target = resolve_font_path(&path);
    if !target.exists() || !target.is_file() {
        return Err(AppError::new(
            ErrorKind::InvalidPath,
            format!("Файл шрифта '{}' не найден", path),
            None,
        ));
    }

    let bytes = std::fs::read(&target).map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось прочитать файл шрифта: {e}"),
            None,
        )
    })?;

    let ext = target
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime = match ext.as_str() {
        "otf" => "font/otf",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        _ => "font/ttf",
    };

    let b64 = to_base64(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}
