pub mod commands;
pub mod error;
pub mod git;
pub mod settings;
pub mod watcher;

use git::{GitRunner, RepoQueue};
use settings::SettingsManager;
use tauri::Manager;
use watcher::RepoWatcher;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let queue = RepoQueue::new();
            let runner = GitRunner::new(queue);
            let watcher = RepoWatcher::new(app.handle().clone());
            let settings_manager = match SettingsManager::new(app.handle()) {
                Ok(mgr) => mgr,
                Err(e) => {
                    eprintln!("Failed to initialize settings manager: {e}");
                    return Err(Box::new(std::io::Error::other(e.to_string())));
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
            app.manage(watcher);
            app.manage(settings_manager);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Git & App commands
            commands::git_check::check_git,
            commands::git_check::set_custom_git_path,
            commands::git_check::get_settings,
            commands::git_check::save_theme,
            commands::git_check::remove_recent_repo,
            commands::repo::open_repo,
            // Status & Diff commands
            commands::status::get_status,
            commands::diff::get_diff,
            commands::diff::get_commit_diff,
            // Log commands
            commands::log::get_commits,
            commands::log::get_commit_details,
            // Staging & Commit commands
            commands::staging::stage_file,
            commands::staging::unstage_file,
            commands::staging::stage_all,
            commands::staging::unstage_all,
            commands::staging::stage_hunk,
            commands::staging::unstage_hunk,
            commands::staging::stage_lines,
            commands::staging::unstage_lines,
            commands::staging::discard_lines,
            commands::staging::discard_file,
            commands::commit::create_commit,
            // Branch, Tag & Merge commands
            commands::branch::get_refs,
            commands::branch::get_repo_state,
            commands::branch::create_branch,
            commands::branch::switch_branch,
            commands::branch::rename_branch,
            commands::branch::delete_branch,
            commands::branch::create_tag,
            commands::branch::delete_tag,
            commands::branch::merge_branch,
            commands::branch::abort_merge,
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
        git::runner::GitInfo::export().expect("Failed to export GitInfo");
        settings::AppSettings::export().expect("Failed to export AppSettings");
        commands::repo::RepoDetails::export().expect("Failed to export RepoDetails");

        // Status & Diff types
        git::parse::FileStatusKind::export().expect("Failed to export FileStatusKind");
        git::parse::BranchInfo::export().expect("Failed to export BranchInfo");
        git::parse::StatusItem::export().expect("Failed to export StatusItem");
        git::parse::RepoStatus::export().expect("Failed to export RepoStatus");
        git::parse::DiffLineKind::export().expect("Failed to export DiffLineKind");
        git::parse::DiffLine::export().expect("Failed to export DiffLine");
        git::parse::DiffHunk::export().expect("Failed to export DiffHunk");
        git::parse::FileDiff::export().expect("Failed to export FileDiff");

        // Watcher event
        watcher::RepoChangedEvent::export().expect("Failed to export RepoChangedEvent");

        // Log types
        git::parse::RefKind::export().expect("Failed to export RefKind");
        git::parse::RefChip::export().expect("Failed to export RefChip");
        git::parse::Commit::export().expect("Failed to export Commit");
        git::parse::CommitFile::export().expect("Failed to export CommitFile");
        git::parse::CommitDetails::export().expect("Failed to export CommitDetails");

        // Branch, Tag & State types
        git::parse::GitRefKind::export().expect("Failed to export GitRefKind");
        git::parse::GitRef::export().expect("Failed to export GitRef");
        git::parse::RepoRefs::export().expect("Failed to export RepoRefs");
        git::state::RepoStateKind::export().expect("Failed to export RepoStateKind");
        git::state::RepoState::export().expect("Failed to export RepoState");
    }
}
