use std::fs;
use std::process::Command;
use tempfile::TempDir;

use lode_lib::git::parse::{parse_commit_files, parse_git_log};
use lode_lib::git::{GitRunner, RepoQueue};

#[tokio::test]
async fn test_stage3_octopus_merge_and_pagination_acceptance() {
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

    // 2. Initial root commit
    let base_file = repo_path.join("base.txt");
    fs::write(&base_file, "Initial base\n").unwrap();
    run_git(&["add", "base.txt"]);
    run_git(&["commit", "-m", "Root commit: старт проекта"]);

    // 3. Feature branch 1
    run_git(&["checkout", "-b", "feat1"]);
    let f1_file = repo_path.join("feat1.txt");
    fs::write(&f1_file, "Feature 1 content\n").unwrap();
    run_git(&["add", "feat1.txt"]);
    run_git(&["commit", "-m", "feat(f1): ветка 1 🚀"]);

    // 4. Feature branch 2
    run_git(&["checkout", "master"]);
    run_git(&["checkout", "-b", "feat2"]);
    let f2_file = repo_path.join("feat2.txt");
    fs::write(&f2_file, "Feature 2 content\n").unwrap();
    run_git(&["add", "feat2.txt"]);
    run_git(&["commit", "-m", "feat(f2): ветка 2 💡"]);

    // 5. Feature branch 3
    run_git(&["checkout", "master"]);
    run_git(&["checkout", "-b", "feat3"]);
    let f3_file = repo_path.join("feat3.txt");
    fs::write(&f3_file, "Feature 3 content\n").unwrap();
    run_git(&["add", "feat3.txt"]);
    run_git(&["commit", "-m", "feat(f3): ветка 3 ✨"]);

    // 6. Return to master and do standard merge with feat1
    run_git(&["checkout", "master"]);
    run_git(&["merge", "--no-ff", "feat1", "-m", "Merge feat1 into master"]);

    // 7. Octopus merge: merge feat2 and feat3 simultaneously
    run_git(&[
        "merge",
        "feat2",
        "feat3",
        "-m",
        "Octopus merge: feat2 and feat3 🐙\n\nСлияние трёх веток одновременно.",
    ]);
    run_git(&["tag", "v1.0.0"]);

    // 8. Create 10 more commits on master to have enough for 3 pages of 5 commits
    for i in 1..=10 {
        let dummy_file = repo_path.join(format!("page_file_{i}.txt"));
        fs::write(&dummy_file, format!("Content {i}\n")).unwrap();
        run_git(&["add", &format!("page_file_{i}.txt")]);
        let msg = format!("chore: commit #{i} for pagination test\n\nMulti-line body line 1\nLine 2");
        run_git(&["commit", "-m", &msg]);
    }

    let queue = RepoQueue::new();
    let runner = GitRunner::new(queue);

    let format_arg =
        "--format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%ce%x1f%ct%x1f%D%x1f%s%x1f%b";

    // 9. Fetch Page 1 (limit: 5, skip: 0)
    let p1_out = runner
        .run_read(
            Some(repo_path),
            &[
                "log",
                "-z",
                "--date-order",
                format_arg,
                "-n",
                "5",
                "--skip",
                "0",
                "--all",
            ],
        )
        .await
        .expect("Page 1 log failed");

    let p1_commits = parse_git_log(&p1_out.stdout);
    assert_eq!(p1_commits.len(), 5);
    assert_eq!(p1_commits[0].author_name, "Иван Автор");

    // 10. Fetch Page 2 (limit: 5, skip: 5)
    let p2_out = runner
        .run_read(
            Some(repo_path),
            &[
                "log",
                "-z",
                "--date-order",
                format_arg,
                "-n",
                "5",
                "--skip",
                "5",
                "--all",
            ],
        )
        .await
        .expect("Page 2 log failed");

    let p2_commits = parse_git_log(&p2_out.stdout);
    assert_eq!(p2_commits.len(), 5);

    // 11. Fetch Page 3 (limit: 5, skip: 10)
    let p3_out = runner
        .run_read(
            Some(repo_path),
            &[
                "log",
                "-z",
                "--date-order",
                format_arg,
                "-n",
                "5",
                "--skip",
                "10",
                "--all",
            ],
        )
        .await
        .expect("Page 3 log failed");

    let p3_commits = parse_git_log(&p3_out.stdout);
    assert!(!p3_commits.is_empty());

    // 12. Locate the octopus merge commit across all commits
    let all_out = runner
        .run_read(
            Some(repo_path),
            &[
                "log",
                "-z",
                "--date-order",
                format_arg,
                "-n",
                "100",
                "--all",
            ],
        )
        .await
        .expect("Full log failed");

    let all_commits = parse_git_log(&all_out.stdout);
    let octopus = all_commits
        .iter()
        .find(|c| c.subject.contains("Octopus merge"))
        .expect("Octopus merge commit not found");

    // Octopus merge must have 3 parents!
    assert_eq!(octopus.parents.len(), 3);
    assert!(octopus.subject.contains("🐙"));
    assert!(octopus.body.contains("Слияние трёх веток"));

    // Check ref tag v1.0.0
    let has_tag = octopus.refs.iter().any(|r| r.name == "v1.0.0");
    assert!(has_tag, "Octopus commit should have tag v1.0.0");

    // 13. Test commit details files
    let show_files_out = runner
        .run_read(
            Some(repo_path),
            &[
                "diff-tree",
                "-r",
                "--name-status",
                "-z",
                "--no-commit-id",
                "--root",
                "-m",
                "--first-parent",
                &octopus.hash,
            ],
        )
        .await
        .expect("Show files failed");

    let files = parse_commit_files(&show_files_out.stdout);
    // Octopus merge added both feat2.txt and feat3.txt
    assert!(files.iter().any(|f| f.path == "feat2.txt"));
    assert!(files.iter().any(|f| f.path == "feat3.txt"));
}
