use std::fs;
use std::process::Command;
use tempfile::TempDir;

use lode_lib::git::conflict::contains_conflict_markers;
use lode_lib::git::parse::parse_status_porcelain_v2;
use lode_lib::git::state::{detect_repo_state, RepoStateKind};
use lode_lib::git::{GitRunner, RepoQueue};

#[tokio::test]
async fn test_stage6_marker_rejection_clean_resolution_and_rebase_conflict_acceptance() {
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
    let shared_file = repo_path.join("shared.txt");
    fs::write(&shared_file, "Initial base line\n").unwrap();
    run_git(&["add", "shared.txt"]);
    run_git(&["commit", "-m", "Root commit"]);

    // Branch feature-conflict
    run_git(&["checkout", "-b", "feature-conflict"]);
    fs::write(&shared_file, "Feature branch version\n").unwrap();
    run_git(&["add", "shared.txt"]);
    run_git(&["commit", "-m", "Feature edit"]);

    // Master conflicting edit
    run_git(&["checkout", "master"]);
    fs::write(&shared_file, "Master branch version\n").unwrap();
    run_git(&["add", "shared.txt"]);
    run_git(&["commit", "-m", "Master edit"]);

    // Merge feature-conflict into master -> triggers conflict!
    let merge_res = runner
        .run_write(repo_path, &["merge", "--", "feature-conflict"])
        .await;
    assert!(merge_res.is_err(), "Merge must produce conflict");

    // Acceptance criterion 1: Cannot resolve file with leftover conflict markers!
    let raw_conflict_content = fs::read_to_string(&shared_file).unwrap();
    assert!(contains_conflict_markers(&raw_conflict_content));

    // Attempting to save with leftover markers must be rejected
    assert!(contains_conflict_markers(&raw_conflict_content));

    // Let's verify that resolving with raw content fails validation
    let has_markers = contains_conflict_markers(&raw_conflict_content);
    assert!(has_markers, "Must contain markers");

    // Acceptance criterion 2: Clean resolution with atomic write and git add
    let resolved_clean_text = "Master branch version resolved manually\n";
    fs::write(&shared_file, resolved_clean_text).unwrap();
    let add_res = runner.run_write(repo_path, &["add", "--", "shared.txt"]).await;
    assert!(add_res.is_ok(), "git add on resolved file must succeed");

    // Verify status has 0 conflicts now
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
    assert_eq!(status.conflicts.len(), 0, "Conflicts must be 0 after resolution");

    // Continue operation to complete merge
    let finish_res = runner
        .run_write(repo_path, &["commit", "--no-edit"])
        .await;
    assert!(finish_res.is_ok(), "Finishing merge must succeed");

    let state = detect_repo_state(&runner, repo_path).await.unwrap();
    assert_eq!(state.kind, RepoStateKind::Normal);

    // =========================================================================
    // Acceptance criterion 3: Rebase with conflict on the 2nd commit
    // =========================================================================
    // Master commits another change
    let master_file = repo_path.join("rebase_target.txt");
    fs::write(&master_file, "Master version of rebase target\n").unwrap();
    run_git(&["add", "rebase_target.txt"]);
    run_git(&["commit", "-m", "Master commit for rebase target"]);

    // Create feature branch from previous master (HEAD~1)
    run_git(&["checkout", "-b", "feature-rebase", "HEAD~1"]);

    // Commit 1 on feature: clean change (touches another file)
    let clean_file = repo_path.join("independent.txt");
    fs::write(&clean_file, "Independent clean feature file\n").unwrap();
    run_git(&["add", "independent.txt"]);
    run_git(&["commit", "-m", "Feature commit 1: clean file"]);

    // Commit 2 on feature: conflicting change on rebase_target.txt
    fs::write(&master_file, "Feature conflicting version of target\n").unwrap();
    run_git(&["add", "rebase_target.txt"]);
    run_git(&["commit", "-m", "Feature commit 2: conflicting target"]);

    // Start rebase of feature-rebase onto master
    let rebase_res = runner
        .run_write(repo_path, &["rebase", "master"])
        .await;
    assert!(rebase_res.is_err(), "Rebase must pause on second conflicting commit");

    // Acceptance criterion: Repo state detects Rebase with step and total_steps!
    let rebase_state = detect_repo_state(&runner, repo_path).await.unwrap();
    assert_eq!(
        rebase_state.kind,
        RepoStateKind::Rebase,
        "Repo state must detect Rebase"
    );
    assert!(rebase_state.step.is_some(), "Rebase step must be detected");
    assert!(rebase_state.total_steps.is_some(), "Total steps must be detected");

    // Verify conflict is in rebase_target.txt
    let rebase_status_out = runner
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
    let rebase_status = parse_status_porcelain_v2(&rebase_status_out.stdout);
    assert_eq!(rebase_status.conflicts.len(), 1);
    assert_eq!(rebase_status.conflicts[0].path, "rebase_target.txt");

    // Resolve conflict in rebase_target.txt cleanly
    fs::write(&master_file, "Resolved rebase target\n").unwrap();
    run_git(&["add", "rebase_target.txt"]);

    // Continue rebase
    let continue_rebase_res = runner
        .run_write(repo_path, &["rebase", "--continue"])
        .await;
    assert!(continue_rebase_res.is_ok(), "rebase --continue must succeed");

    // Rebase completed cleanly
    let final_state = detect_repo_state(&runner, repo_path).await.unwrap();
    assert_eq!(
        final_state.kind,
        RepoStateKind::Normal,
        "Repo state must return to Normal after rebase finish"
    );
}
