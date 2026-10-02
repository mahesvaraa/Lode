use lode_lib::git::parse::{parse_status_porcelain_v2, parse_unified_diff, FileStatusKind};

#[test]
fn test_fixture_status_dirty() {
    let fixture_str = include_str!("fixtures/status_dirty.txt");
    // Convert newlines to NUL bytes to match -z porcelain v2 output
    let nul_bytes: Vec<u8> = fixture_str
        .lines()
        .flat_map(|line| {
            let mut v = line.as_bytes().to_vec();
            v.push(0);
            v
        })
        .collect();

    let status = parse_status_porcelain_v2(&nul_bytes);
    assert_eq!(status.branch.head, Some("main".to_string()));
    assert_eq!(status.branch.ahead, 1);
    assert_eq!(status.branch.behind, 2);

    // Staged list has service.ts (M) and DiffView.tsx (A)
    assert_eq!(status.staged.len(), 2);
    assert_eq!(status.staged[0].path, "src/git/service.ts");
    assert_eq!(status.staged[1].path, "src/ui/DiffView.tsx");

    // Unstaged list has service.ts (M), tokens.css (M), README.md (D), untracked_file.txt (?)
    assert_eq!(status.unstaged.len(), 4);
    assert_eq!(status.unstaged[0].path, "src/git/service.ts");
    assert_eq!(status.unstaged[1].path, "src/styles/tokens.css");
    assert_eq!(status.unstaged[2].path, "README.md");
    assert_eq!(status.unstaged[3].path, "untracked_file.txt");
}

#[test]
fn test_fixture_diff_complex() {
    let fixture_bytes = include_bytes!("fixtures/diff_complex.patch");
    let diffs = parse_unified_diff(fixture_bytes);

    assert_eq!(diffs.len(), 3);

    // 1. Modified TypeScript file
    assert_eq!(diffs[0].new_path, "src/service.ts");
    assert_eq!(diffs[0].status, FileStatusKind::Modified);
    assert!(!diffs[0].is_binary);
    assert_eq!(diffs[0].hunks.len(), 1);
    assert_eq!(diffs[0].total_additions, 2);
    assert_eq!(diffs[0].total_deletions, 1);

    // 2. Renamed Markdown file with spaces
    assert_eq!(diffs[1].old_path, Some("docs/old guide.md".to_string()));
    assert_eq!(diffs[1].new_path, "docs/new manual.md");
    assert_eq!(diffs[1].status, FileStatusKind::Renamed);
    assert_eq!(diffs[1].total_additions, 1);
    assert_eq!(diffs[1].total_deletions, 1);

    // 3. Added Binary file
    assert_eq!(diffs[2].new_path, "assets/icon.png");
    assert_eq!(diffs[2].status, FileStatusKind::Added);
    assert!(diffs[2].is_binary);
}
