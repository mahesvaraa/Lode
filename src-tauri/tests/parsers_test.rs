use lode_lib::git::parse::{
    parse_git_log, parse_status_porcelain_v2, parse_unified_diff, FileStatusKind, RefKind,
};

#[test]
fn test_fixture_status_dirty() {
    let fixture_str = include_str!("fixtures/status_dirty.txt");
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

    assert_eq!(status.staged.len(), 2);
    assert_eq!(status.staged[0].path, "src/git/service.ts");
    assert_eq!(status.staged[1].path, "src/ui/DiffView.tsx");

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
    assert_eq!(diffs[0].new_path, "src/service.ts");
    assert_eq!(diffs[0].status, FileStatusKind::Modified);
    assert!(!diffs[0].is_binary);

    assert_eq!(diffs[1].old_path, Some("docs/old guide.md".to_string()));
    assert_eq!(diffs[1].new_path, "docs/new manual.md");
    assert_eq!(diffs[1].status, FileStatusKind::Renamed);

    assert_eq!(diffs[2].new_path, "assets/icon.png");
    assert_eq!(diffs[2].status, FileStatusKind::Added);
    assert!(diffs[2].is_binary);
}

#[test]
fn test_log_octopus_merge_parser() {
    let mut raw_bytes = Vec::new();

    // Commit 1: Octopus merge with 4 parents, Cyrillic, emoji, multiline body
    raw_bytes.extend_from_slice(b"hash1\x1fhash1_s\x1fp1 p2 p3 p4\x1f\xD0\x90\xD0\xBB\xD0\xB5\xD0\xBA\xD1\x81\xD0\xB0\xD0\xBD\xD0\xB4\xD1\x80\x1falex@example.com\x1f1705000000\x1fAlex\x1falex@example.com\x1f1705000000\x1fHEAD -> main, tag: v2.0.0, origin/main\x1fOctopus merge 4 \xD0\xB2\xD0\xB5\xD1\x82\xD0\xBE\xD0\xBA \xF0\x9F\x90\x99\x1fBody line 1\nBody line 2\x00");

    // Commit 2: Root commit without parents, empty body
    raw_bytes.extend_from_slice(b"root\x1froot_s\x1f\x1fRoot Author\x1froot@corp.com\x1f1600000000\x1fRoot Author\x1froot@corp.com\x1f1600000000\x1ftag: v0.1.0\x1fInitial root commit\x1f\x00");

    let commits = parse_git_log(&raw_bytes);
    assert_eq!(commits.len(), 2);

    let c1 = &commits[0];
    assert_eq!(c1.hash, "hash1");
    assert_eq!(c1.parents, vec!["p1", "p2", "p3", "p4"]);
    assert_eq!(c1.author_name, "Александр");
    assert_eq!(c1.subject, "Octopus merge 4 веток 🐙");
    assert_eq!(c1.body, "Body line 1\nBody line 2");
    assert_eq!(c1.refs.len(), 4);
    assert_eq!(c1.refs[0].name, "HEAD");
    assert_eq!(c1.refs[1].name, "main");
    assert_eq!(c1.refs[2].name, "v2.0.0");
    assert_eq!(c1.refs[2].kind, RefKind::Tag);

    let c2 = &commits[1];
    assert_eq!(c2.hash, "root");
    assert!(c2.parents.is_empty());
    assert_eq!(c2.subject, "Initial root commit");
    assert!(c2.body.is_empty());
    assert_eq!(c2.refs.len(), 1);
    assert_eq!(c2.refs[0].kind, RefKind::Tag);
}
