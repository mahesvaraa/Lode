use std::fs;
use std::process::Command;
use tempfile::TempDir;

use lode_lib::git::parse::{parse_status_porcelain_v2, parse_unified_diff, DiffLineKind};
use lode_lib::git::patch::build_hunk_patch;
use lode_lib::git::{GitRunner, RepoQueue};

#[tokio::test]
async fn test_stage2_partial_staging_acceptance() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let repo_path = temp_dir.path();

    let run_git = |args: &[&str]| {
        let status = Command::new("git")
            .args(args)
            .current_dir(repo_path)
            .env("GIT_TERMINAL_PROMPT", "0")
            .env("GIT_AUTHOR_NAME", "Test Author")
            .env("GIT_AUTHOR_EMAIL", "author@example.com")
            .env("GIT_COMMITTER_NAME", "Test Committer")
            .env("GIT_COMMITTER_EMAIL", "committer@example.com")
            .status()
            .expect("Failed to execute git");
        assert!(status.success(), "Git command failed: {:?}", args);
    };

    // 1. Init repo and config
    run_git(&["init"]);
    run_git(&["config", "user.name", "Test User"]);
    run_git(&["config", "user.email", "test@example.com"]);
    run_git(&["config", "core.autocrlf", "false"]);

    // 2. Initial baseline file with 7 lines
    let file_path = repo_path.join("document.txt");
    let initial_content = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\n";
    fs::write(&file_path, initial_content).unwrap();

    run_git(&["add", "document.txt"]);
    run_git(&["commit", "-m", "Initial commit"]);

    // 3. Modify lines in the middle:
    // Replace line 3, 4, 5 with new content (inserting 5 additions and 2 deletions)
    let modified_content = "line 1\nline 2\nmiddle add 1\nmiddle add 2\nmiddle add 3\nmiddle add 4\nmiddle add 5\nline 6\nline 7\n";
    fs::write(&file_path, modified_content).unwrap();

    let queue = RepoQueue::new();
    let runner = GitRunner::new(queue);

    // 4. Get unstaged diff
    let diff_out = runner
        .run_read(
            Some(repo_path),
            &[
                "diff",
                "--no-ext-diff",
                "--no-color",
                "-p",
                "--unified=3",
                "--",
                "document.txt",
            ],
        )
        .await
        .expect("Failed to read diff");

    let file_diffs = parse_unified_diff(&diff_out.stdout);
    assert_eq!(file_diffs.len(), 1);
    let hunk = &file_diffs[0].hunks[0];

    // Find the indices of the addition lines
    let addition_indices: Vec<usize> = hunk
        .lines
        .iter()
        .enumerate()
        .filter(|(_, l)| l.kind == DiffLineKind::Addition)
        .map(|(idx, _)| idx)
        .collect();

    // There should be 5 addition lines in the modified content
    assert_eq!(addition_indices.len(), 5);

    // Select middle 3 lines from the 5 additions: indices 1, 2, 3 of the additions
    let selected_line_indices = vec![
        addition_indices[1], // "middle add 2"
        addition_indices[2], // "middle add 3"
        addition_indices[3], // "middle add 4"
    ];

    // 5. Build patch and apply to index: git apply --cached --recount -
    let patch = build_hunk_patch(&file_diffs[0], 0, &selected_line_indices)
        .expect("Failed to build partial hunk patch");

    runner
        .run_write_stdin(
            repo_path,
            &["apply", "--cached", "--recount", "-"],
            &patch,
        )
        .await
        .expect("Failed to apply patch to index");

    // 6. Acceptance Criteria: check git diff --cached
    // The staged diff must contain EXACTLY the 3 selected lines and NOT the other 2 additions!
    let staged_diff_out = runner
        .run_read(
            Some(repo_path),
            &[
                "diff",
                "--cached",
                "--no-ext-diff",
                "--no-color",
                "-p",
                "--unified=3",
                "--",
                "document.txt",
            ],
        )
        .await
        .expect("Failed to read cached diff");

    let staged_str = String::from_utf8_lossy(&staged_diff_out.stdout);

    assert!(staged_str.contains("+middle add 2"));
    assert!(staged_str.contains("+middle add 3"));
    assert!(staged_str.contains("+middle add 4"));
    assert!(!staged_str.contains("+middle add 1"));
    assert!(!staged_str.contains("+middle add 5"));

    // 7. Acceptance Criteria: commit with emoji and quotes
    let commit_message = "feat(core): \"quoted subject\" & 'single quotes' with emoji 🚀\n\nDetailed body with 💡 and \"more quotes\".";

    runner
        .run_write_stdin(
            repo_path,
            &["commit", "-F", "-"],
            commit_message.as_bytes(),
        )
        .await
        .expect("Failed to commit with emojis and quotes");

    // Verify commit in git log
    let log_out = runner
        .run_read(Some(repo_path), &["log", "-1", "--format=%B"])
        .await
        .expect("Failed to read log");

    let logged_message = String::from_utf8_lossy(&log_out.stdout).trim().to_string();
    assert_eq!(logged_message, commit_message);

    // 8. Verify status after commit
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
        .expect("Failed to read status");

    let status = parse_status_porcelain_v2(&status_out.stdout);
    // document.txt still has the remaining unstaged changes (middle add 1 and 5)
    assert!(status.staged.is_empty());
    assert_eq!(status.unstaged.len(), 1);
    assert_eq!(status.unstaged[0].path, "document.txt");
}
