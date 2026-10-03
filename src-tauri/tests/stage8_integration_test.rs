use std::fs;
use std::process::Command;
use tempfile::TempDir;

use lode_lib::git::parse::parse_git_log;
use lode_lib::git::rebase::{RebaseActionKind, RebaseTodoItem};
use lode_lib::git::state::{detect_repo_state, RepoStateKind};
use lode_lib::git::{GitRunner, RepoQueue};

const LOG_FORMAT: &str =
    "--format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%ce%x1f%ct%x1f%D%x1f%s%x1f%b";

#[tokio::test]
async fn test_stage8_reorder_reword_and_squash_three_commits_acceptance() {
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

    // 1. Setup repository
    run_git(&["init"]);
    run_git(&["config", "user.name", "Иван Автор"]);
    run_git(&["config", "user.email", "ivan@example.com"]);
    run_git(&["config", "core.autocrlf", "false"]);

    let queue = RepoQueue::new();
    let runner = GitRunner::new(queue);

    // Initial root commit
    let root_file = repo_path.join("root.txt");
    fs::write(&root_file, "Root line\n").unwrap();
    run_git(&["add", "root.txt"]);
    run_git(&["commit", "-m", "Root commit"]);

    let root_hash_out = runner
        .run_read(Some(repo_path), &["rev-parse", "HEAD"])
        .await
        .unwrap();
    let root_hash = String::from_utf8_lossy(&root_hash_out.stdout)
        .trim()
        .to_string();

    // =========================================================================
    // Part 1: Reorder and Reword
    // =========================================================================
    // Commit A
    let a_file = repo_path.join("a.txt");
    fs::write(&a_file, "Content A\n").unwrap();
    run_git(&["add", "a.txt"]);
    run_git(&["commit", "-m", "Original Commit A"]);

    let a_hash = String::from_utf8_lossy(
        &runner
            .run_read(Some(repo_path), &["rev-parse", "HEAD"])
            .await
            .unwrap()
            .stdout,
    )
    .trim()
    .to_string();

    // Commit B
    let b_file = repo_path.join("b.txt");
    fs::write(&b_file, "Content B\n").unwrap();
    run_git(&["add", "b.txt"]);
    run_git(&["commit", "-m", "Original Commit B"]);

    let b_hash = String::from_utf8_lossy(
        &runner
            .run_read(Some(repo_path), &["rev-parse", "HEAD"])
            .await
            .unwrap()
            .stdout,
    )
    .trim()
    .to_string();

    // Reorder B then A, and reword B
    let reorder_items = vec![
        RebaseTodoItem {
            action: RebaseActionKind::Reword,
            hash: b_hash.clone(),
            short_hash: b_hash[..7].to_string(),
            subject: "Original Commit B".to_string(),
            author_name: "Иван Автор".to_string(),
            is_published: false,
            reword_message: Some("Reworded Commit B Message".to_string()),
        },
        RebaseTodoItem {
            action: RebaseActionKind::Pick,
            hash: a_hash.clone(),
            short_hash: a_hash[..7].to_string(),
            subject: "Original Commit A".to_string(),
            author_name: "Иван Автор".to_string(),
            is_published: false,
            reword_message: None,
        },
    ];

    let rebase_state = lode_lib::commands::rebase::start_interactive_rebase_inner(
        &runner,
        &repo_path.to_string_lossy(),
        &root_hash,
        reorder_items,
    )
    .await
    .expect("Rebase must succeed");

    assert_eq!(rebase_state.kind, RepoStateKind::Normal);

    // Verify history: HEAD is A, HEAD~1 is Reworded B!
    let log_out = runner
        .run_read(
            Some(repo_path),
            &["log", "-z", "--date-order", LOG_FORMAT, "-n", "3"],
        )
        .await
        .unwrap();
    let commits = parse_git_log(&log_out.stdout);
    assert_eq!(commits.len(), 3);
    assert_eq!(commits[0].subject, "Original Commit A");
    assert_eq!(commits[1].subject, "Reworded Commit B Message");
    assert_eq!(commits[2].subject, "Root commit");

    // =========================================================================
    // Part 2: Squash 3 Commits into 1 (Acceptance Criterion)
    // =========================================================================
    let base_before_squash = commits[0].hash.clone();

    // Commit 1
    let sq1_file = repo_path.join("sq1.txt");
    fs::write(&sq1_file, "Squash part 1\n").unwrap();
    run_git(&["add", "sq1.txt"]);
    run_git(&["commit", "-m", "Squash commit 1"]);
    let sq1_hash = String::from_utf8_lossy(
        &runner
            .run_read(Some(repo_path), &["rev-parse", "HEAD"])
            .await
            .unwrap()
            .stdout,
    )
    .trim()
    .to_string();

    // Commit 2
    let sq2_file = repo_path.join("sq2.txt");
    fs::write(&sq2_file, "Squash part 2\n").unwrap();
    run_git(&["add", "sq2.txt"]);
    run_git(&["commit", "-m", "Squash commit 2"]);
    let sq2_hash = String::from_utf8_lossy(
        &runner
            .run_read(Some(repo_path), &["rev-parse", "HEAD"])
            .await
            .unwrap()
            .stdout,
    )
    .trim()
    .to_string();

    // Commit 3
    let sq3_file = repo_path.join("sq3.txt");
    fs::write(&sq3_file, "Squash part 3\n").unwrap();
    run_git(&["add", "sq3.txt"]);
    run_git(&["commit", "-m", "Squash commit 3"]);
    let sq3_hash = String::from_utf8_lossy(
        &runner
            .run_read(Some(repo_path), &["rev-parse", "HEAD"])
            .await
            .unwrap()
            .stdout,
    )
    .trim()
    .to_string();

    // Squash 3 commits: Pick sq1, Squash sq2, Squash sq3
    let squash_items = vec![
        RebaseTodoItem {
            action: RebaseActionKind::Pick,
            hash: sq1_hash.clone(),
            short_hash: sq1_hash[..7].to_string(),
            subject: "Squash commit 1".to_string(),
            author_name: "Иван Автор".to_string(),
            is_published: false,
            reword_message: None,
        },
        RebaseTodoItem {
            action: RebaseActionKind::Squash,
            hash: sq2_hash.clone(),
            short_hash: sq2_hash[..7].to_string(),
            subject: "Squash commit 2".to_string(),
            author_name: "Иван Автор".to_string(),
            is_published: false,
            reword_message: None,
        },
        RebaseTodoItem {
            action: RebaseActionKind::Squash,
            hash: sq3_hash.clone(),
            short_hash: sq3_hash[..7].to_string(),
            subject: "Squash commit 3".to_string(),
            author_name: "Иван Автор".to_string(),
            is_published: false,
            reword_message: None,
        },
    ];

    let squash_state = lode_lib::commands::rebase::start_interactive_rebase_inner(
        &runner,
        &repo_path.to_string_lossy(),
        &base_before_squash,
        squash_items,
    )
    .await
    .expect("Squash rebase must succeed");

    assert_eq!(squash_state.kind, RepoStateKind::Normal);

    // Verify history: only 1 new commit exists on top of base_before_squash!
    let squash_log_out = runner
        .run_read(
            Some(repo_path),
            &["log", "-z", "--date-order", LOG_FORMAT, "-n", "2"],
        )
        .await
        .unwrap();
    let squash_commits = parse_git_log(&squash_log_out.stdout);
    assert_eq!(squash_commits[1].hash, base_before_squash);

    // The single squashed commit at HEAD contains all three files!
    assert!(sq1_file.exists());
    assert!(sq2_file.exists());
    assert!(sq3_file.exists());

    let state = detect_repo_state(&runner, repo_path).await.unwrap();
    assert_eq!(state.kind, RepoStateKind::Normal);
}
