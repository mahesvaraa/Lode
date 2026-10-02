use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::status::FileStatusKind;

const MAX_DIFF_LINES: usize = 5000;
const MAX_DIFF_BYTES: usize = 1024 * 1024; // 1 MB

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/diff_line_kind.ts")]
pub enum DiffLineKind {
    Context,
    Addition,
    Deletion,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/diff_line.ts")]
pub struct DiffLine {
    pub kind: DiffLineKind,
    pub old_no: Option<u32>,
    pub new_no: Option<u32>,
    pub text: String,
    pub no_eol: bool,
    pub has_crlf: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/diff_hunk.ts")]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/file_diff.ts")]
pub struct FileDiff {
    pub old_path: Option<String>,
    pub new_path: String,
    pub status: FileStatusKind,
    pub is_binary: bool,
    pub old_mode: Option<String>,
    pub new_mode: Option<String>,
    pub hunks: Vec<DiffHunk>,
    pub total_additions: usize,
    pub total_deletions: usize,
    pub is_truncated: bool,
    pub total_lines: usize,
    pub raw_size_bytes: usize,
}

/// Pure parser for unified diff output
pub fn parse_unified_diff(raw_bytes: &[u8]) -> Vec<FileDiff> {
    let mut files = Vec::new();
    let raw_size_bytes = raw_bytes.len();
    let is_payload_huge = raw_size_bytes > MAX_DIFF_BYTES;

    // Split raw bytes by newline b'\n' to preserve trailing b'\r' for CRLF detection
    let mut raw_lines: Vec<&[u8]> = raw_bytes.split(|&b| b == b'\n').collect();
    if raw_lines.last() == Some(&(&b""[..])) {
        raw_lines.pop();
    }
    let mut line_idx = 0;

    while line_idx < raw_lines.len() {
        let raw_line = raw_lines[line_idx];
        let has_crlf = raw_line.ends_with(b"\r");
        let line_content = if has_crlf {
            &raw_line[..raw_line.len() - 1]
        } else {
            raw_line
        };
        let line = String::from_utf8_lossy(line_content);
        line_idx += 1;

        if line.starts_with("diff --git ") {
            let mut file_diff = parse_file_diff_header(&line);
            file_diff.raw_size_bytes = raw_size_bytes;

            let mut current_hunk: Option<DiffHunk> = None;
            let mut total_lines_parsed = 0;
            let mut is_truncated = is_payload_huge;

            while line_idx < raw_lines.len() {
                let peek_raw = raw_lines[line_idx];
                let peek_has_crlf = peek_raw.ends_with(b"\r");
                let peek_content = if peek_has_crlf {
                    &peek_raw[..peek_raw.len() - 1]
                } else {
                    peek_raw
                };
                let next_line = String::from_utf8_lossy(peek_content);

                if next_line.starts_with("diff --git ") {
                    break;
                }

                line_idx += 1;
                let cur_line = next_line;
                let cur_has_crlf = peek_has_crlf;

                if let Some(m) = cur_line.strip_prefix("old mode ") {
                    file_diff.old_mode = Some(m.trim().to_string());
                    file_diff.status = FileStatusKind::Modified;
                    continue;
                }
                if let Some(m) = cur_line.strip_prefix("new mode ") {
                    file_diff.new_mode = Some(m.trim().to_string());
                    file_diff.status = FileStatusKind::Modified;
                    continue;
                }
                if let Some(m) = cur_line.strip_prefix("deleted file mode ") {
                    file_diff.old_mode = Some(m.trim().to_string());
                    file_diff.status = FileStatusKind::Deleted;
                    continue;
                }
                if let Some(m) = cur_line.strip_prefix("new file mode ") {
                    file_diff.new_mode = Some(m.trim().to_string());
                    file_diff.status = FileStatusKind::Added;
                    continue;
                }
                if let Some(p) = cur_line.strip_prefix("rename from ") {
                    file_diff.old_path = Some(p.trim().to_string());
                    file_diff.status = FileStatusKind::Renamed;
                    continue;
                }
                if let Some(p) = cur_line.strip_prefix("rename to ") {
                    file_diff.new_path = p.trim().to_string();
                    file_diff.status = FileStatusKind::Renamed;
                    continue;
                }
                if cur_line.starts_with("similarity index ") {
                    file_diff.status = FileStatusKind::Renamed;
                    continue;
                }
                if cur_line.starts_with("Binary files ") || cur_line.starts_with("GIT binary patch") {
                    file_diff.is_binary = true;
                    continue;
                }
                if cur_line.starts_with("index ") || cur_line.starts_with("--- ") || cur_line.starts_with("+++ ") {
                    continue;
                }

                // Hunk header: "@@ -a,b +c,d @@" or "@@ -a +c @@"
                if cur_line.starts_with("@@ ") {
                    if let Some(hunk) = current_hunk.take() {
                        file_diff.hunks.push(hunk);
                    }

                    if let Some(parsed_hunk) = parse_hunk_header(&cur_line) {
                        current_hunk = Some(parsed_hunk);
                    }
                    continue;
                }

                // Lines inside a hunk
                if let Some(ref mut hunk) = current_hunk {
                    if cur_line.starts_with(r"\ No newline at end of file") {
                        if let Some(last_line) = hunk.lines.last_mut() {
                            last_line.no_eol = true;
                        }
                        continue;
                    }

                    if total_lines_parsed >= MAX_DIFF_LINES {
                        is_truncated = true;
                        continue;
                    }

                    let (kind, text_slice) = if let Some(stripped) = cur_line.strip_prefix('+') {
                        file_diff.total_additions += 1;
                        (DiffLineKind::Addition, stripped)
                    } else if let Some(stripped) = cur_line.strip_prefix('-') {
                        file_diff.total_deletions += 1;
                        (DiffLineKind::Deletion, stripped)
                    } else if let Some(stripped) = cur_line.strip_prefix(' ') {
                        (DiffLineKind::Context, stripped)
                    } else {
                        // Empty line inside hunk
                        (DiffLineKind::Context, "")
                    };

                    let (old_no, new_no) = compute_line_numbers(hunk, kind);

                    hunk.lines.push(DiffLine {
                        kind,
                        old_no,
                        new_no,
                        text: text_slice.to_string(),
                        no_eol: false,
                        has_crlf: cur_has_crlf,
                    });

                    total_lines_parsed += 1;
                }
            }

            if let Some(hunk) = current_hunk.take() {
                file_diff.hunks.push(hunk);
            }

            file_diff.is_truncated = is_truncated;
            file_diff.total_lines = total_lines_parsed;
            files.push(file_diff);
        }
    }

    files
}

fn parse_file_diff_header(header_line: &str) -> FileDiff {
    // "diff --git a/path/to/old b/path/to/new"
    let parts = header_line.trim_start_matches("diff --git ").trim();

    // Standard format has "a/..." and "b/..."
    let (old_path, new_path) = if let Some((a, b)) = parts.split_once(" b/") {
        let clean_a = a.trim_start_matches("a/").trim();
        let clean_b = b.trim();
        (Some(clean_a.to_string()), clean_b.to_string())
    } else {
        (None, parts.to_string())
    };

    FileDiff {
        old_path,
        new_path,
        status: FileStatusKind::Modified,
        is_binary: false,
        old_mode: None,
        new_mode: None,
        hunks: Vec::new(),
        total_additions: 0,
        total_deletions: 0,
        is_truncated: false,
        total_lines: 0,
        raw_size_bytes: 0,
    }
}

fn parse_hunk_header(line: &str) -> Option<DiffHunk> {
    // e.g. "@@ -42,7 +42,11 @@ export class GitService"
    let rest = line.strip_prefix("@@ -")?;
    let (numbers, header_content) = rest.split_once(" @@")?;
    let (old_part, new_part) = numbers.split_once(" +")?;

    let (old_start, old_lines) = parse_range(old_part);
    let (new_start, new_lines) = parse_range(new_part);

    Some(DiffHunk {
        old_start,
        old_lines,
        new_start,
        new_lines,
        header: header_content.trim().to_string(),
        lines: Vec::new(),
    })
}

fn parse_range(part: &str) -> (u32, u32) {
    if let Some((start_s, lines_s)) = part.split_once(',') {
        (
            start_s.parse::<u32>().unwrap_or(1),
            lines_s.parse::<u32>().unwrap_or(1),
        )
    } else {
        (part.parse::<u32>().unwrap_or(1), 1)
    }
}

fn compute_line_numbers(hunk: &DiffHunk, kind: DiffLineKind) -> (Option<u32>, Option<u32>) {
    let mut old_count = hunk.old_start;
    let mut new_count = hunk.new_start;

    for l in &hunk.lines {
        match l.kind {
            DiffLineKind::Context => {
                old_count += 1;
                new_count += 1;
            }
            DiffLineKind::Deletion => {
                old_count += 1;
            }
            DiffLineKind::Addition => {
                new_count += 1;
            }
        }
    }

    match kind {
        DiffLineKind::Context => (Some(old_count), Some(new_count)),
        DiffLineKind::Deletion => (Some(old_count), None),
        DiffLineKind::Addition => (None, Some(new_count)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_standard_diff() {
        let diff_input = br#"diff --git a/src/service.ts b/src/service.ts
index e69de29..4b825dc 100644
--- a/src/service.ts
+++ b/src/service.ts
@@ -42,3 +42,4 @@ export class GitService
   async status() {
-    return run(["status"]);
+    const out = await run(["status", "--porcelain=v2"]);
+    return out;
   }
"#;
        let files = parse_unified_diff(diff_input);
        assert_eq!(files.len(), 1);

        let file = &files[0];
        assert_eq!(file.new_path, "src/service.ts");
        assert_eq!(file.old_path, Some("src/service.ts".to_string()));
        assert_eq!(file.status, FileStatusKind::Modified);
        assert!(!file.is_binary);
        assert_eq!(file.hunks.len(), 1);

        let hunk = &file.hunks[0];
        assert_eq!(hunk.old_start, 42);
        assert_eq!(hunk.new_start, 42);
        assert_eq!(hunk.lines.len(), 5);

        // Context line
        assert_eq!(hunk.lines[0].kind, DiffLineKind::Context);
        assert_eq!(hunk.lines[0].old_no, Some(42));
        assert_eq!(hunk.lines[0].new_no, Some(42));

        // Deletion line
        assert_eq!(hunk.lines[1].kind, DiffLineKind::Deletion);
        assert_eq!(hunk.lines[1].old_no, Some(43));
        assert_eq!(hunk.lines[1].new_no, None);

        // Addition line 1
        assert_eq!(hunk.lines[2].kind, DiffLineKind::Addition);
        assert_eq!(hunk.lines[2].old_no, None);
        assert_eq!(hunk.lines[2].new_no, Some(43));

        // Addition line 2
        assert_eq!(hunk.lines[3].kind, DiffLineKind::Addition);
        assert_eq!(hunk.lines[3].old_no, None);
        assert_eq!(hunk.lines[3].new_no, Some(44));
    }

    #[test]
    fn test_parse_binary_file_diff() {
        let diff_input = br#"diff --git a/logo.png b/logo.png
new file mode 100644
index 0000000..f7a8b9c
Binary files /dev/null and b/logo.png differ
"#;
        let files = parse_unified_diff(diff_input);
        assert_eq!(files.len(), 1);
        let file = &files[0];
        assert_eq!(file.new_path, "logo.png");
        assert_eq!(file.status, FileStatusKind::Added);
        assert!(file.is_binary);
        assert!(file.hunks.is_empty());
    }

    #[test]
    fn test_parse_rename_with_spaces() {
        let diff_input = br#"diff --git a/docs/old guide.md b/docs/new manual.md
similarity index 98%
rename from docs/old guide.md
rename to docs/new manual.md
index 1234567..89abcde 100644
--- a/docs/old guide.md
+++ b/docs/new manual.md
@@ -1,2 +1,2 @@
 # Manual
-Old version
+New version
"#;
        let files = parse_unified_diff(diff_input);
        assert_eq!(files.len(), 1);
        let file = &files[0];
        assert_eq!(file.old_path, Some("docs/old guide.md".to_string()));
        assert_eq!(file.new_path, "docs/new manual.md");
        assert_eq!(file.status, FileStatusKind::Renamed);
        assert_eq!(file.hunks.len(), 1);
    }

    #[test]
    fn test_parse_no_newline_at_end_of_file() {
        let diff_input = br#"diff --git a/file.txt b/file.txt
index 1111111..2222222 100644
--- a/file.txt
+++ b/file.txt
@@ -1,1 +1,1 @@
-old line
\ No newline at end of file
+new line
\ No newline at end of file
"#;
        let files = parse_unified_diff(diff_input);
        assert_eq!(files.len(), 1);
        let hunk = &files[0].hunks[0];
        assert_eq!(hunk.lines.len(), 2);
        assert!(hunk.lines[0].no_eol);
        assert!(hunk.lines[1].no_eol);
    }

    #[test]
    fn test_parse_crlf_endings() {
        let diff_input = b"diff --git a/crlf.txt b/crlf.txt\r\nindex 111..222 100644\r\n--- a/crlf.txt\r\n+++ b/crlf.txt\r\n@@ -1,1 +1,1 @@\r\n-line\r\n+line edited\r\n";
        let files = parse_unified_diff(diff_input);
        assert_eq!(files.len(), 1);
        let hunk = &files[0].hunks[0];
        assert_eq!(hunk.lines.len(), 2);
        assert!(hunk.lines[0].has_crlf);
        assert!(hunk.lines[1].has_crlf);
    }
}
