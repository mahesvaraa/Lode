use std::fs;
use std::process::Command;
use tempfile::TempDir;

use lode_lib::git::conflict::contains_conflict_markers;
use lode_lib::git::parse::{
    parse_git_blame_porcelain, parse_git_log, parse_git_stash_list, parse_status_porcelain_v2,
};
use lode_lib::git::{GitRunner, RepoQueue};

#[tokio::test]
async fn test_stage7_stash_pop_conflict_acceptance_and_ops_suite() {
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
    let file_path = repo_path.join("file.txt");
    fs::write(&file_path, "Base line 1\nBase line 2\n").unwrap();
    run_git(&["add", "file.txt"]);
    run_git(&["commit", "-m", "Root commit"]);

    // =========================================================================
    // 2. Primary Acceptance Criterion: Stash creation with -u and Pop Conflict
    // =========================================================================
    // Modify tracked file and create untracked file
    fs::write(&file_path, "Stashed modification line\nBase line 2\n").unwrap();
    let untracked_path = repo_path.join("untracked.txt");
    fs::write(&untracked_path, "Untracked new file\n").unwrap();

    // Stash with -u (include untracked)
    let stash_save_res = runner
        .run_write(repo_path, &["stash", "push", "-u", "-m", "WIP test stash"])
        .await;
    assert!(stash_save_res.is_ok(), "stash push -u must succeed");

    // Working directory must be clean now
    let status_clean = runner
        .run_read(
            Some(repo_path),
            &["status", "--porcelain=v2", "-z", "--branch"],
        )
        .await
        .unwrap();
    let parsed_clean = parse_status_porcelain_v2(&status_clean.stdout);
    assert_eq!(parsed_clean.staged.len(), 0);
    assert_eq!(parsed_clean.unstaged.len(), 0);

    // Verify stash list has the saved stash
    let stash_list_out = runner
        .run_read(
            Some(repo_path),
            &["stash", "list", "--format=%gd%x1f%H%x1f%at%x1f%gs%x00"],
        )
        .await
        .unwrap();
    let stashes = parse_git_stash_list(&stash_list_out.stdout);
    assert_eq!(stashes.len(), 1);
    assert_eq!(stashes[0].selector, "stash@{0}");
    assert!(stashes[0].message.contains("WIP test stash"));

    // Verify stash show -p diff
    let stash_diff_out = runner
        .run_read(Some(repo_path), &["stash", "show", "-p", "--", "stash@{0}"])
        .await
        .unwrap();
    let diff_str = String::from_utf8_lossy(&stash_diff_out.stdout);
    assert!(diff_str.contains("Stashed modification line"));

    // Make conflicting change on master and commit it
    fs::write(&file_path, "Conflicting master modification\nBase line 2\n").unwrap();
    run_git(&["add", "file.txt"]);
    run_git(&["commit", "-m", "Master conflicting edit"]);

    // Stash pop: must fail due to conflict!
    let pop_res = runner
        .run_write(repo_path, &["stash", "pop", "--", "stash@{0}"])
        .await;
    assert!(pop_res.is_err(), "stash pop with conflict must return error");

    // ACCEPTANCE: Status now has conflicted entries for ConflictsView!
    let status_conflict = runner
        .run_read(
            Some(repo_path),
            &["status", "--porcelain=v2", "-z", "--branch"],
        )
        .await
        .unwrap();
    let parsed_conflict = parse_status_porcelain_v2(&status_conflict.stdout);
    assert_eq!(parsed_conflict.conflicts.len(), 1, "Must have 1 conflict");
    assert_eq!(parsed_conflict.conflicts[0].path, "file.txt");

    // File contains raw conflict markers
    let conflicted_content = fs::read_to_string(&file_path).unwrap();
    assert!(contains_conflict_markers(&conflicted_content));

    // Stash is preserved in stash list on conflict!
    let stash_list_after = runner
        .run_read(
            Some(repo_path),
            &["stash", "list", "--format=%gd%x1f%H%x1f%at%x1f%gs%x00"],
        )
        .await
        .unwrap();
    let stashes_after = parse_git_stash_list(&stash_list_after.stdout);
    assert_eq!(stashes_after.len(), 1, "Stash must remain on pop conflict");

    // Clean up conflict to proceed with other tests
    fs::write(&file_path, "Resolved file content\n").unwrap();
    run_git(&["add", "file.txt"]);
    run_git(&["commit", "-m", "Resolve pop conflict"]);
    run_git(&["stash", "drop", "stash@{0}"]);

    // =========================================================================
    // 3. Cherry-pick (single commit and merge commit with -m 1)
    // =========================================================================
    run_git(&["checkout", "-b", "feature-cherry"]);
    let feat_file = repo_path.join("cherry_feat.txt");
    fs::write(&feat_file, "Cherry feature line\n").unwrap();
    run_git(&["add", "cherry_feat.txt"]);
    run_git(&["commit", "-m", "Commit to cherry-pick"]);

    let cherry_hash_out = runner
        .run_read(Some(repo_path), &["rev-parse", "HEAD"])
        .await
        .unwrap();
    let cherry_hash = String::from_utf8_lossy(&cherry_hash_out.stdout)
        .trim()
        .to_string();

    // Switch back to master and cherry-pick
    run_git(&["checkout", "master"]);
    let cp_res = runner
        .run_write(repo_path, &["cherry-pick", "--", &cherry_hash])
        .await;
    assert!(cp_res.is_ok(), "Cherry-pick of normal commit must succeed");
    assert!(repo_path.join("cherry_feat.txt").exists());

    // =========================================================================
    // 4. Revert
    // =========================================================================
    let rev_res = runner
        .run_write(repo_path, &["revert", "--no-edit", "--", "HEAD"])
        .await;
    assert!(rev_res.is_ok(), "git revert --no-edit must succeed");
    assert!(!repo_path.join("cherry_feat.txt").exists());

    // =========================================================================
    // 5. Reset (soft, mixed, hard, and restoration via ORIG_HEAD)
    // =========================================================================
    let commit_file = repo_path.join("reset_test.txt");
    fs::write(&commit_file, "Testing reset\n").unwrap();
    run_git(&["add", "reset_test.txt"]);
    run_git(&["commit", "-m", "Commit before reset"]);

    // Soft reset: HEAD~1
    let soft_res = runner
        .run_write(repo_path, &["reset", "--soft", "HEAD~1"])
        .await;
    assert!(soft_res.is_ok());
    let status_soft = runner
        .run_read(
            Some(repo_path),
            &["status", "--porcelain=v2", "-z", "--branch"],
        )
        .await
        .unwrap();
    let parsed_soft = parse_status_porcelain_v2(&status_soft.stdout);
    assert!(parsed_soft.staged.iter().any(|s| s.path == "reset_test.txt"));

    // Mixed reset: HEAD
    let mixed_res = runner
        .run_write(repo_path, &["reset", "--mixed", "HEAD"])
        .await;
    assert!(mixed_res.is_ok());
    let status_mixed = runner
        .run_read(
            Some(repo_path),
            &["status", "--porcelain=v2", "-z", "--branch"],
        )
        .await
        .unwrap();
    let parsed_mixed = parse_status_porcelain_v2(&status_mixed.stdout);
    assert!(parsed_mixed.unstaged.iter().any(|s| s.path == "reset_test.txt"));

    // Re-commit it
    run_git(&["add", "reset_test.txt"]);
    run_git(&["commit", "-m", "Recommit before hard reset"]);
    assert!(commit_file.exists());

    // Hard reset to HEAD~1: moves back and removes reset_test.txt!
    let hard_res = runner
        .run_write(repo_path, &["reset", "--hard", "HEAD~1"])
        .await;
    assert!(hard_res.is_ok());
    assert!(!commit_file.exists(), "Hard reset to HEAD~1 must remove tracked file from that commit");

    // Restore via ORIG_HEAD!
    let restore_res = runner
        .run_write(repo_path, &["reset", "--hard", "ORIG_HEAD"])
        .await;
    assert!(restore_res.is_ok());
    assert!(commit_file.exists(), "Restoring via ORIG_HEAD must bring back reset_test.txt");

    // =========================================================================
    // 6. Blame & File History (--follow)
    // =========================================================================
    let blame_out = runner
        .run_read(Some(repo_path), &["blame", "--porcelain", "--", "file.txt"])
        .await
        .unwrap();
    let blame_lines = parse_git_blame_porcelain(&blame_out.stdout);
    assert!(!blame_lines.is_empty(), "Blame lines must not be empty");
    assert_eq!(blame_lines[0].author_name, "Иван Автор");

    // File history with rename and --follow
    run_git(&["mv", "file.txt", "renamed_file.txt"]);
    run_git(&["commit", "-m", "Rename file"]);

    let format = "--format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%ce%x1f%ct%x1f%D%x1f%s%x1f%b";
    let hist_out = runner
        .run_read(
            Some(repo_path),
            &["log", "-z", "--date-order", format, "--follow", "--", "renamed_file.txt"],
        )
        .await
        .unwrap();

    let history_commits = parse_git_log(&hist_out.stdout);
    assert!(!history_commits.is_empty(), "History must follow file across renames");
    assert!(history_commits.iter().any(|c| c.subject == "Root commit"));
    assert!(history_commits.iter().any(|c| c.subject == "Rename file"));
}
