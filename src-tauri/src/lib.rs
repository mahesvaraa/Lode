pub mod commands;
pub mod error;
pub mod git;
pub mod settings;
pub mod watcher;

use git::{GitRunner, RepoQueue};
use settings::SettingsManager;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let queue = RepoQueue::new();
            let runner = GitRunner::new(queue);
            let settings_manager = match SettingsManager::new(app.handle()) {
                Ok(mgr) => mgr,
                Err(e) => {
                    eprintln!("Failed to initialize settings manager: {e}");
                    return Err(Box::new(std::io::Error::other(
                        e.to_string(),
                    )));
                }
            };

            let settings = settings_manager.load();
            if let Some(git_path) = settings.git_path {
                let r = runner.clone();
                tauri::async_runtime::spawn(async move {
                    r.set_custom_git_path(Some(git_path.into())).await;
                });
            }

            app.manage(runner);
            app.manage(settings_manager);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::git_check::check_git,
            commands::git_check::set_custom_git_path,
            commands::git_check::get_settings,
            commands::git_check::save_theme,
            commands::git_check::remove_recent_repo,
            commands::repo::open_repo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use ts_rs::TS;

    #[test]
    fn export_bindings() {
        error::ErrorKind::export().expect("Failed to export ErrorKind");
        error::AppError::export().expect("Failed to export AppError");
        git::GitInfo::export().expect("Failed to export GitInfo");
        settings::AppSettings::export().expect("Failed to export AppSettings");
        commands::repo::RepoDetails::export().expect("Failed to export RepoDetails");
    }
}
