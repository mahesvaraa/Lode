use std::fs;
use std::process::Command;
use tempfile::TempDir;

use lode_lib::git::parse::{parse_status_porcelain_v2, parse_unified_diff, FileStatusKind};
use lode_lib::git::{GitRunner, RepoQueue};

#[tokio::test]
async fn test_acceptance_criteria_repo() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let repo_path = temp_dir.path();

    // Helper to run git command in temp repo
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

    // 1. Init repo
    run_git(&["init"]);
    run_git(&["config", "user.name", "Test User"]);
    run_git(&["config", "user.email", "test@example.com"]);
    run_git(&["config", "core.autocrlf", "false"]);

    // 2. Initial commit with baseline files
    let file_to_rename = repo_path.join("old file.txt");
    fs::write(&file_to_rename, "Original text\nLine 2\n").unwrap();

    let crlf_file = repo_path.join("crlf_file.txt");
    fs::write(&crlf_file, "Line 1\r\nLine 2\r\n").unwrap();

    let mm_file = repo_path.join("partially staged.txt");
    fs::write(&mm_file, "Base version\n").unwrap();

    run_git(&["add", "-A"]);
    run_git(&["commit", "-m", "Initial baseline commit"]);

    // 3. Make changes:
    // a) Rename with spaces
    let _new_rename_path = repo_path.join("new file with spaces.txt");
    run_git(&["mv", "old file.txt", "new file with spaces.txt"]);

    // b) Modify CRLF file
    fs::write(&crlf_file, "Line 1\r\nLine 2 edited\r\n").unwrap();

    // c) Binary file with null bytes
    let bin_file = repo_path.join("test_asset.bin");
    fs::write(&bin_file, &[0x89, 0x50, 0x4E, 0x47, 0x00, 0x00, 0x00, 0x0D]).unwrap();

    // d) MM file (staged edit + unstaged edit)
    fs::write(&mm_file, "Base version\nStaged addition\n").unwrap();
    run_git(&["add", "partially staged.txt"]);
    fs::write(&mm_file, "Base version\nStaged addition\nUnstaged addition\n").unwrap();

    // 4. Test Runner and Status Parser
    let queue = RepoQueue::new();
    let runner = GitRunner::new(queue);

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
        .expect("Failed to run status");

    let repo_status = parse_status_porcelain_v2(&status_out.stdout);

    // Staged files should contain:
    // - "new file with spaces.txt" (Renamed, orig_path: "old file.txt")
    // - "partially staged.txt" (Modified)
    assert!(
        repo_status
            .staged
            .iter()
            .any(|f| f.path == "new file with spaces.txt"
                && f.orig_path.as_deref() == Some("old file.txt")
                && f.status == FileStatusKind::Renamed),
        "Rename not found in staged: {:?}",
        repo_status.staged
    );
    assert!(
        repo_status
            .staged
            .iter()
            .any(|f| f.path == "partially staged.txt" && f.status == FileStatusKind::Modified),
        "Partially staged file not in staged"
    );

    // Unstaged files should contain:
    // - "partially staged.txt" (Modified)
    // - "crlf_file.txt" (Modified)
    // - "test_asset.bin" (Untracked)
    assert!(
        repo_status
            .unstaged
            .iter()
            .any(|f| f.path == "partially staged.txt" && f.status == FileStatusKind::Modified),
        "Partially staged file not in unstaged"
    );
    assert!(
        repo_status
            .unstaged
            .iter()
            .any(|f| f.path == "crlf_file.txt" && f.status == FileStatusKind::Modified),
        "CRLF file not in unstaged"
    );
    assert!(
        repo_status
            .unstaged
            .iter()
            .any(|f| f.path == "test_asset.bin" && f.status == FileStatusKind::Untracked),
        "Binary untracked file not in unstaged"
    );

    // 5. Test Diff for Rename
    let rename_diff_out = runner
        .run_read(
            Some(repo_path),
            &[
                "diff",
                "--cached",
                "-M",
                "--no-ext-diff",
                "--no-color",
                "-p",
                "--unified=3",
                "--",
                "old file.txt",
                "new file with spaces.txt",
            ],
        )
        .await
        .expect("Failed to get rename diff");
    let rename_diffs = parse_unified_diff(&rename_diff_out.stdout);
    assert_eq!(rename_diffs.len(), 1);
    assert_eq!(rename_diffs[0].new_path, "new file with spaces.txt");
    assert_eq!(rename_diffs[0].old_path, Some("old file.txt".to_string()));
    assert_eq!(rename_diffs[0].status, FileStatusKind::Renamed);

    // 6. Test Diff for CRLF
    let crlf_diff_out = runner
        .run_read(
            Some(repo_path),
            &[
                "diff",
                "--no-ext-diff",
                "--no-color",
                "-p",
                "--unified=3",
                "--",
                "crlf_file.txt",
            ],
        )
        .await
        .expect("Failed to get CRLF diff");
    let crlf_diffs = parse_unified_diff(&crlf_diff_out.stdout);
    assert_eq!(crlf_diffs.len(), 1);
    assert!(
        crlf_diffs[0].hunks[0]
            .lines
            .iter()
            .any(|l| l.has_crlf),
        "CRLF not detected in lines"
    );
}
