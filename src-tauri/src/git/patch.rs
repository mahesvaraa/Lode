use crate::git::parse::{DiffLineKind, FileDiff, FileStatusKind};

/// Builds a patch for staging, unstaging, or discarding specific lines of a hunk, or an entire hunk.
///
/// Algorithm according to Section 7.1 of CLAUDE.md:
/// 1. Takes file header (`diff --git`, `---`, `+++`)
/// 2. For selected lines:
///    - unselected `+` lines are removed from the hunk
///    - unselected `-` lines become context lines (leading space)
/// 3. Recounts counters in the hunk header: `@@ -old_start,old_lines +new_start,new_lines @@`
/// 4. Preserves `\ No newline at end of file` marker directly after its corresponding line.
/// 5. Preserves CRLF line endings as-is without normalization.
pub fn build_hunk_patch(
    file_diff: &FileDiff,
    hunk_index: usize,
    selected_line_indices: &[usize],
) -> Result<Vec<u8>, String> {
    if hunk_index >= file_diff.hunks.len() {
        return Err(format!(
            "Hunk index {} out of bounds (total hunks: {})",
            hunk_index,
            file_diff.hunks.len()
        ));
    }

    let hunk = &file_diff.hunks[hunk_index];
    let mut patch = Vec::new();

    let old_p = file_diff
        .old_path
        .as_deref()
        .unwrap_or(&file_diff.new_path);
    let new_p = &file_diff.new_path;

    // 1. Build file header
    let header = match file_diff.status {
        FileStatusKind::Added => {
            format!(
                "diff --git a/{new_p} b/{new_p}\n--- /dev/null\n+++ b/{new_p}\n"
            )
        }
        FileStatusKind::Deleted => {
            format!(
                "diff --git a/{old_p} b/{old_p}\n--- a/{old_p}\n+++ /dev/null\n"
            )
        }
        _ => {
            format!(
                "diff --git a/{old_p} b/{new_p}\n--- a/{old_p}\n+++ b/{new_p}\n"
            )
        }
    };
    patch.extend_from_slice(header.as_bytes());

    // 2. Filter lines and recount
    let mut patch_lines: Vec<(char, &str, bool, bool)> = Vec::new();
    let mut old_count = 0u32;
    let mut new_count = 0u32;

    for (idx, line) in hunk.lines.iter().enumerate() {
        let is_selected = selected_line_indices.contains(&idx);

        match line.kind {
            DiffLineKind::Context => {
                patch_lines.push((' ', &line.text, line.no_eol, line.has_crlf));
                old_count += 1;
                new_count += 1;
            }
            DiffLineKind::Addition => {
                if is_selected {
                    patch_lines.push(('+', &line.text, line.no_eol, line.has_crlf));
                    new_count += 1;
                }
                // Unselected additions are omitted entirely
            }
            DiffLineKind::Deletion => {
                if is_selected {
                    patch_lines.push(('-', &line.text, line.no_eol, line.has_crlf));
                    old_count += 1;
                } else {
                    // Unselected deletions become context lines
                    patch_lines.push((' ', &line.text, line.no_eol, line.has_crlf));
                    old_count += 1;
                    new_count += 1;
                }
            }
        }
    }

    if patch_lines.is_empty() {
        return Err("No lines selected in patch".to_string());
    }

    // 3. Hunk header with recounted ranges
    let hunk_header = format!(
        "@@ -{},{} +{},{} @@\n",
        hunk.old_start, old_count, hunk.new_start, new_count
    );
    patch.extend_from_slice(hunk_header.as_bytes());

    // 4. Output lines with correct line endings and no-newline markers
    for (prefix, text, no_eol, has_crlf) in patch_lines {
        patch.push(prefix as u8);
        patch.extend_from_slice(text.as_bytes());

        if has_crlf {
            patch.extend_from_slice(b"\r\n");
        } else {
            patch.push(b'\n');
        }

        if no_eol {
            patch.extend_from_slice(b"\\ No newline at end of file\n");
        }
    }

    Ok(patch)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::git::parse::{parse_unified_diff, DiffHunk, DiffLine, DiffLineKind};

    #[test]
    fn test_build_full_hunk_patch() {
        let diff_input = br#"diff --git a/test.txt b/test.txt
index 111..222 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 line 1
-line 2 old
+line 2 new
+line 2.5 added
 line 3
"#;
        let files = parse_unified_diff(diff_input);
        assert_eq!(files.len(), 1);

        let patch = build_hunk_patch(&files[0], 0, &[0, 1, 2, 3, 4]).unwrap();
        let patch_str = String::from_utf8_lossy(&patch);

        assert!(patch_str.contains("diff --git a/test.txt b/test.txt"));
        assert!(patch_str.contains("--- a/test.txt"));
        assert!(patch_str.contains("+++ b/test.txt"));
        assert!(patch_str.contains("@@ -1,3 +1,4 @@"));
        assert!(patch_str.contains("-line 2 old"));
        assert!(patch_str.contains("+line 2 new"));
        assert!(patch_str.contains("+line 2.5 added"));
    }

    #[test]
    fn test_partial_line_selection_omits_addition_and_converts_deletion() {
        let diff_input = br#"diff --git a/test.txt b/test.txt
index 111..222 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 ctx 1
-del 1
+add 1
+add 2
 ctx 2
"#;
        let files = parse_unified_diff(diff_input);
        // lines: 0=ctx 1, 1=del 1, 2=add 1, 3=add 2, 4=ctx 2
        // Select ONLY add 1 (line index 2)
        // del 1 (not selected) should convert to ' ctx', add 2 (not selected) should be omitted!
        let patch = build_hunk_patch(&files[0], 0, &[2]).unwrap();
        let patch_str = String::from_utf8_lossy(&patch);

        // del 1 turned into context line
        assert!(patch_str.contains(" del 1\n"));
        // add 1 is kept as addition
        assert!(patch_str.contains("+add 1\n"));
        // add 2 is NOT in the patch
        assert!(!patch_str.contains("add 2"));

        // Recount: old had ctx 1, del 1 (now ctx), ctx 2 = 3 lines
        // new has ctx 1, del 1 (now ctx), add 1 (+), ctx 2 = 4 lines
        assert!(patch_str.contains("@@ -1,3 +1,4 @@"));
    }

    #[test]
    fn test_crlf_preservation_in_patch() {
        let hunk = DiffHunk {
            old_start: 1,
            old_lines: 1,
            new_start: 1,
            new_lines: 2,
            header: String::new(),
            lines: vec![
                DiffLine {
                    kind: DiffLineKind::Context,
                    old_no: Some(1),
                    new_no: Some(1),
                    text: "crlf line".to_string(),
                    no_eol: false,
                    has_crlf: true,
                },
                DiffLine {
                    kind: DiffLineKind::Addition,
                    old_no: None,
                    new_no: Some(2),
                    text: "added crlf line".to_string(),
                    no_eol: false,
                    has_crlf: true,
                },
            ],
        };

        let file_diff = FileDiff {
            old_path: Some("crlf.txt".to_string()),
            new_path: "crlf.txt".to_string(),
            status: FileStatusKind::Modified,
            is_binary: false,
            old_mode: None,
            new_mode: None,
            hunks: vec![hunk],
            total_additions: 1,
            total_deletions: 0,
            is_truncated: false,
            total_lines: 2,
            raw_size_bytes: 50,
        };

        let patch = build_hunk_patch(&file_diff, 0, &[1]).unwrap();
        // Check that patch contains \r\n
        assert!(patch.windows(2).any(|w| w == b"\r\n"));
    }

    #[test]
    fn test_no_newline_marker_in_patch() {
        let hunk = DiffHunk {
            old_start: 1,
            old_lines: 1,
            new_start: 1,
            new_lines: 1,
            header: String::new(),
            lines: vec![
                DiffLine {
                    kind: DiffLineKind::Deletion,
                    old_no: Some(1),
                    new_no: None,
                    text: "old without newline".to_string(),
                    no_eol: true,
                    has_crlf: false,
                },
                DiffLine {
                    kind: DiffLineKind::Addition,
                    old_no: None,
                    new_no: Some(1),
                    text: "new without newline".to_string(),
                    no_eol: true,
                    has_crlf: false,
                },
            ],
        };

        let file_diff = FileDiff {
            old_path: Some("noeol.txt".to_string()),
            new_path: "noeol.txt".to_string(),
            status: FileStatusKind::Modified,
            is_binary: false,
            old_mode: None,
            new_mode: None,
            hunks: vec![hunk],
            total_additions: 1,
            total_deletions: 1,
            is_truncated: false,
            total_lines: 2,
            raw_size_bytes: 40,
        };

        let patch = build_hunk_patch(&file_diff, 0, &[0, 1]).unwrap();
        let patch_str = String::from_utf8_lossy(&patch);
        assert!(patch_str.contains(r"\ No newline at end of file"));
    }
}
