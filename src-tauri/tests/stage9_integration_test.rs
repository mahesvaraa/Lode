use tempfile::TempDir;

use lode_lib::git::{GitRunner, RepoQueue};
use lode_lib::settings::SettingsManager;

#[tokio::test]
async fn test_stage9_settings_persistence_and_git_resolution() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_file = temp_dir.path().join("test_settings.json");

    let manager = SettingsManager::from_path(config_file.clone());

    // 1. Verify defaults
    let defaults = manager.load();
    assert_eq!(defaults.theme, "system");
    assert_eq!(defaults.font_size, 13);
    assert_eq!(defaults.pull_mode, "ff-only");
    assert!(defaults.font_family.contains("Geist"));
    assert!(defaults.code_font_family.contains("Geist Mono"));
    assert!(!defaults.enable_fsmonitor);
    assert!(!defaults.enable_untracked_cache);

    // 2. Save customized settings
    let mut custom = defaults.clone();
    custom.theme = "dark".to_string();
    custom.font_size = 16;
    custom.pull_mode = "rebase".to_string();
    custom.font_family = "Inter, sans-serif".to_string();
    custom.code_font_family = "Fira Code, monospace".to_string();
    custom.external_editor = Some("code".to_string());
    custom.enable_fsmonitor = true;
    custom.enable_untracked_cache = true;

    manager.save(&custom).expect("Save must succeed");
    assert!(config_file.exists());

    // 3. Reload from fresh manager instance and verify
    let reloader = SettingsManager::from_path(config_file.clone());
    let loaded = reloader.load();
    assert_eq!(loaded.theme, "dark");
    assert_eq!(loaded.font_size, 16);
    assert_eq!(loaded.pull_mode, "rebase");
    assert_eq!(loaded.font_family, "Inter, sans-serif");
    assert_eq!(loaded.code_font_family, "Fira Code, monospace");
    assert_eq!(loaded.external_editor, Some("code".to_string()));
    assert!(loaded.enable_fsmonitor);
    assert!(loaded.enable_untracked_cache);

    // 4. Test recent repos management (prepending and cap of 10)
    for i in 0..15 {
        let repo_dir = temp_dir.path().join(format!("repo_{i}"));
        std::fs::create_dir_all(&repo_dir).unwrap();
        manager
            .add_recent_repo(&repo_dir.to_string_lossy())
            .expect("Add recent repo must succeed");
    }

    let with_recents = manager.load();
    assert_eq!(with_recents.recent_repos.len(), 10);
    // Most recent (repo_14) should be at index 0
    assert!(with_recents.recent_repos[0].contains("repo_14"));

    // 5. Verify Git executable resolution and version validation
    let queue = RepoQueue::new();
    let runner = GitRunner::new(queue);

    let git_bin = runner.resolve_git_executable().await;
    assert!(git_bin.is_ok(), "Must find git executable in PATH or standard location");

    let info = runner.check_git_installation().await;
    assert!(info.available, "Git must be available");
    assert!(info.is_valid_version, "Git must be at least version 2.30.0");
    assert!(info.version.is_some());
}
