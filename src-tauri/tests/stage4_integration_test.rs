use std::fs;
use std::process::Command;
use tempfile::TempDir;

use lode_lib::git::parse::{parse_git_refs, parse_status_porcelain_v2};
use lode_lib::git::state::{detect_repo_state, RepoStateKind};
use lode_lib::git::{GitRunner, RepoQueue};

#[tokio::test]
async fn test_stage4_clean_merge_conflict_merge_and_abort_acceptance() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let repo_path = temp_dir.path();

    let run_git = |args: &[&str]| {
        let status = Command::new("git")
            .args(args)
            .current_dir(repo_path)
            .env("GIT_TERMINAL_PROMPT", "0")
            .env("GIT_AUTHOR_NAME", "Иван Автор")
            .env("GIT_AUTHOR_EMAIL", "ivan@example.com")
            .env("GIT_COMMITTER_NAME", "Петр Коммитер")
            .env("GIT_COMMITTER_EMAIL", "petr@example.com")
            .status()
            .expect("Failed to execute git");
        assert!(status.success(), "Git command failed: {:?}", args);
    };

    // 1. Init repo and config
    run_git(&["init"]);
    run_git(&["config", "user.name", "Иван Автор"]);
    run_git(&["config", "user.email", "ivan@example.com"]);
    run_git(&["config", "core.autocrlf", "false"]);

    // 2. Initial commit on master
    let base_file = repo_path.join("base.txt");
    fs::write(&base_file, "Initial base line\n").unwrap();
    run_git(&["add", "base.txt"]);
    run_git(&["commit", "-m", "Initial commit"]);

    let queue = RepoQueue::new();
    let runner = GitRunner::new(queue);

    // Initial state check
    let state = detect_repo_state(&runner, repo_path).await.unwrap();
    assert_eq!(state.kind, RepoStateKind::Normal);

    // 3. Create branch feat-clean
    run_git(&["checkout", "-b", "feat-clean"]);
    let clean_file = repo_path.join("clean.txt");
    fs::write(&clean_file, "Clean new feature\n").unwrap();
    run_git(&["add", "clean.txt"]);
    run_git(&["commit", "-m", "feat: add clean feature"]);

    // Switch to master and merge feat-clean (Clean merge without conflicts)
    run_git(&["checkout", "master"]);
    let clean_merge_res = runner
        .run_write(repo_path, &["merge", "--no-ff", "--", "feat-clean"])
        .await;
    assert!(clean_merge_res.is_ok(), "Clean merge should succeed");

    let state = detect_repo_state(&runner, repo_path).await.unwrap();
    assert_eq!(state.kind, RepoStateKind::Normal);
    assert!(repo_path.join("clean.txt").exists());

    // 4. Create branch feat-conflict
    run_git(&["checkout", "-b", "feat-conflict"]);
    fs::write(&base_file, "Conflict line from feat-conflict\n").unwrap();
    run_git(&["add", "base.txt"]);
    run_git(&["commit", "-m", "feat: conflicting edit on feat-conflict"]);

    // Switch to master and make conflicting edit
    run_git(&["checkout", "master"]);
    fs::write(&base_file, "Conflict line from master\n").unwrap();
    run_git(&["add", "base.txt"]);
    run_git(&["commit", "-m", "feat: conflicting edit on master"]);

    // 5. Merge feat-conflict into master -> MUST trigger merge conflict!
    let conflict_merge_res = runner
        .run_write(repo_path, &["merge", "--", "feat-conflict"])
        .await;
    // git merge returns non-zero on conflict
    assert!(conflict_merge_res.is_err(), "Merge with conflicts returns error");

    // Acceptance criterion: banner appears (detect_repo_state detects MERGE_HEAD)
    let state_during_conflict = detect_repo_state(&runner, repo_path).await.unwrap();
    assert_eq!(
        state_during_conflict.kind,
        RepoStateKind::Merge,
        "Repo state must be Merge when MERGE_HEAD exists"
    );

    // Acceptance criterion: status shows 'u' (conflicted) records
    let status_out = runner
        .run_read(
            Some(repo_path),
            &[
                "status",
                "--porcelain=v2",
                "-z",
                "--branch",
                "--untracked-files=normal",
            ],
        )
        .await
        .unwrap();

    let status = parse_status_porcelain_v2(&status_out.stdout);
    assert_eq!(status.conflicts.len(), 1, "Status must show 1 conflicted file");
    assert_eq!(status.conflicts[0].path, "base.txt");

    // 6. Acceptance criterion: "Отменить" (abort) returns repo to clean initial state
    let abort_res = runner
        .run_write(repo_path, &["merge", "--abort"])
        .await;
    assert!(abort_res.is_ok(), "git merge --abort must succeed");

    let state_after_abort = detect_repo_state(&runner, repo_path).await.unwrap();
    assert_eq!(
        state_after_abort.kind,
        RepoStateKind::Normal,
        "State must return to Normal after abort"
    );

    let status_after_abort_out = runner
        .run_read(
            Some(repo_path),
            &[
                "status",
                "--porcelain=v2",
                "-z",
                "--branch",
                "--untracked-files=normal",
            ],
        )
        .await
        .unwrap();

    let status_after_abort = parse_status_porcelain_v2(&status_after_abort_out.stdout);
    assert!(status_after_abort.conflicts.is_empty(), "Conflicts must be cleared");
    assert!(status_after_abort.staged.is_empty());
    assert!(status_after_abort.unstaged.is_empty());

    // 7. Test Tags: create tag and delete tag
    run_git(&["tag", "-a", "-m", "Release 1.2.3", "v1.2.3"]);

    let refs_format =
        "--format=%(refname)\t%(objectname)\t%(upstream:short)\t%(upstream:track)\t%(HEAD)\t%(creatordate:unix)\t%(*objectname)";

    let refs_out = runner
        .run_read(
            Some(repo_path),
            &["for-each-ref", refs_format, "refs/heads", "refs/remotes", "refs/tags"],
        )
        .await
        .unwrap();

    let refs = parse_git_refs(&refs_out.stdout);
    assert!(refs.tags.iter().any(|t| t.name == "v1.2.3"));

    run_git(&["tag", "-d", "v1.2.3"]);

    let refs_after_delete_out = runner
        .run_read(
            Some(repo_path),
            &["for-each-ref", refs_format, "refs/heads", "refs/remotes", "refs/tags"],
        )
        .await
        .unwrap();

    let refs_after_delete = parse_git_refs(&refs_after_delete_out.stdout);
    assert!(!refs_after_delete.tags.iter().any(|t| t.name == "v1.2.3"));
}
