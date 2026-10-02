use std::fs;
use std::process::Command;
use tempfile::TempDir;

use lode_lib::error::ErrorKind;
use lode_lib::git::parse::parse_git_remotes;
use lode_lib::git::{GitRunner, RepoQueue};

#[tokio::test]
async fn test_stage5_bare_remote_fetch_pull_rejected_push_and_force_lease_acceptance() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let base_path = temp_dir.path();

    let bare_dir = base_path.join("bare.git");
    let local1_dir = base_path.join("local1");
    let local2_dir = base_path.join("local2");

    fs::create_dir_all(&bare_dir).unwrap();
    fs::create_dir_all(&local1_dir).unwrap();
    fs::create_dir_all(&local2_dir).unwrap();

    let run_git = |dir: &std::path::Path, args: &[&str]| {
        let status = Command::new("git")
            .args(args)
            .current_dir(dir)
            .env("GIT_TERMINAL_PROMPT", "0")
            .env("GIT_AUTHOR_NAME", "Иван Автор")
            .env("GIT_AUTHOR_EMAIL", "ivan@example.com")
            .env("GIT_COMMITTER_NAME", "Петр Коммитер")
            .env("GIT_COMMITTER_EMAIL", "petr@example.com")
            .status()
            .expect("Failed to execute git");
        assert!(status.success(), "Git command failed in {:?}: {:?}", dir, args);
    };

    // 1. Init bare remote repository
    run_git(&bare_dir, &["init", "--bare"]);

    // Convert bare path to git url format (e.g. file:///... or plain path)
    let bare_path_str = bare_dir.to_str().unwrap().replace('\\', "/");

    // 2. Setup local1
    run_git(&local1_dir, &["init"]);
    run_git(&local1_dir, &["config", "user.name", "Иван Автор"]);
    run_git(&local1_dir, &["config", "user.email", "ivan@example.com"]);
    run_git(&local1_dir, &["config", "core.autocrlf", "false"]);
    run_git(&local1_dir, &["remote", "add", "origin", &bare_path_str]);

    let queue = RepoQueue::new();
    let runner = GitRunner::new(queue);

    // Initial commit in local1 and push with -u
    let file1 = local1_dir.join("file1.txt");
    fs::write(&file1, "Line 1\n").unwrap();
    run_git(&local1_dir, &["add", "file1.txt"]);
    run_git(&local1_dir, &["commit", "-m", "Initial commit from local1"]);

    // Push with -u
    let push_res = runner
        .run_remote(&local1_dir, &["push", "-u", "origin", "master"])
        .await;
    assert!(push_res.is_ok(), "Initial push from local1 should succeed");

    // Test list_remotes parser
    let remotes_out = runner
        .run_read(Some(&local1_dir), &["remote", "-v"])
        .await
        .unwrap();
    let remotes = parse_git_remotes(&remotes_out.stdout);
    assert_eq!(remotes.len(), 1);
    assert_eq!(remotes[0].name, "origin");

    // 3. Setup local2 and clone/pull from bare
    run_git(&local2_dir, &["init"]);
    run_git(&local2_dir, &["config", "user.name", "Второй Разработчик"]);
    run_git(&local2_dir, &["config", "user.email", "dev2@example.com"]);
    run_git(&local2_dir, &["config", "core.autocrlf", "false"]);
    run_git(&local2_dir, &["remote", "add", "origin", &bare_path_str]);
    run_git(&local2_dir, &["pull", "origin", "master"]);

    // local2 makes a commit and pushes to origin/master
    let file2 = local2_dir.join("file2.txt");
    fs::write(&file2, "Line 2 from dev2\n").unwrap();
    run_git(&local2_dir, &["add", "file2.txt"]);
    run_git(&local2_dir, &["commit", "-m", "Commit from local2"]);
    run_git(&local2_dir, &["push", "origin", "master"]);

    // 4. Back in local1: make a commit WITHOUT pulling first
    let file1_alt = local1_dir.join("local1_change.txt");
    fs::write(&file1_alt, "Local1 diverged\n").unwrap();
    run_git(&local1_dir, &["add", "local1_change.txt"]);
    run_git(&local1_dir, &["commit", "-m", "Diverged commit in local1"]);

    // Acceptance criterion: push must be rejected by server!
    let rejected_push = runner
        .run_remote(&local1_dir, &["push", "origin", "master"])
        .await;
    assert!(rejected_push.is_err(), "Diverged push must be rejected");

    let err = rejected_push.unwrap_err();
    assert_eq!(
        err.kind,
        ErrorKind::PushRejected,
        "Error kind must be PushRejected"
    );
    assert!(
        err.message.contains("Отклонено сервером: удалённая ветка содержит коммиты, которых нет локально"),
        "Error message must be clear and helpful: {}",
        err.message
    );

    // 5. Acceptance criterion: Fetch and Pull (rebase or merge)
    let fetch_res = runner
        .run_remote(&local1_dir, &["fetch", "--all", "--prune"])
        .await;
    assert!(fetch_res.is_ok(), "Fetch should succeed");

    let pull_res = runner
        .run_remote(&local1_dir, &["pull", "--no-rebase", "origin", "master"])
        .await;
    assert!(pull_res.is_ok(), "Pull with merge should succeed");
    assert!(local1_dir.join("file2.txt").exists());

    // Push after pull succeeds
    let post_pull_push = runner
        .run_remote(&local1_dir, &["push", "origin", "master"])
        .await;
    assert!(post_pull_push.is_ok(), "Push after pull should succeed");

    // 6. Test --force-with-lease
    // Reset local1 back one commit and make an alternative commit
    run_git(&local1_dir, &["reset", "--hard", "HEAD~1"]);
    let force_file = local1_dir.join("force_file.txt");
    fs::write(&force_file, "Force leased content\n").unwrap();
    run_git(&local1_dir, &["add", "force_file.txt"]);
    run_git(&local1_dir, &["commit", "-m", "Force rewrite commit"]);

    let force_push_res = runner
        .run_remote(&local1_dir, &["push", "--force-with-lease", "origin", "master"])
        .await;
    assert!(force_push_res.is_ok(), "Push with --force-with-lease should succeed");

    // 7. Remote management: add, rename, set-url, remove
    let add_remote_res = runner
        .run_write(&local1_dir, &["remote", "add", "backup", &bare_path_str])
        .await;
    assert!(add_remote_res.is_ok());

    let rename_remote_res = runner
        .run_write(&local1_dir, &["remote", "rename", "backup", "backup2"])
        .await;
    assert!(rename_remote_res.is_ok());

    let remotes_after_rename = runner
        .run_read(Some(&local1_dir), &["remote", "-v"])
        .await
        .unwrap();
    let remotes_list = parse_git_remotes(&remotes_after_rename.stdout);
    assert!(remotes_list.iter().any(|r| r.name == "backup2"));
    assert!(!remotes_list.iter().any(|r| r.name == "backup"));

    let remove_remote_res = runner
        .run_write(&local1_dir, &["remote", "remove", "backup2"])
        .await;
    assert!(remove_remote_res.is_ok());
}
