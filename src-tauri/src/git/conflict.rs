use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/conflict_block.ts")]
pub struct ConflictBlock {
    pub id: usize,
    pub base: Option<String>,
    pub ours: String,
    pub theirs: String,
    pub start_line: usize,
    pub end_line: usize,
    pub is_identical: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/parsed_conflict_file.ts")]
pub struct ParsedConflictFile {
    pub path: String,
    pub has_markers: bool,
    pub crlf: bool,
    pub blocks: Vec<ConflictBlock>,
    pub clean_text_suggestion: String,
}

/// Checks whether content contains raw git conflict markers
pub fn contains_conflict_markers(content: &str) -> bool {
    for line in content.lines() {
        let trimmed_line = line.trim_end_matches('\r');
        if is_marker_start(trimmed_line, "<<<<<<<")
            || is_marker_start(trimmed_line, "=======")
            || is_marker_start(trimmed_line, ">>>>>>>")
            || is_marker_start(trimmed_line, "|||||||")
        {
            return true;
        }
    }
    false
}

fn is_marker_start(line: &str, marker: &str) -> bool {
    if let Some(rest) = line.strip_prefix(marker) {
        rest.is_empty() || rest.starts_with(' ') || rest.starts_with('\t')
    } else {
        false
    }
}

enum ParserState {
    Outside,
    InOurs,
    InBase,
    InTheirs,
}

/// Pure parser for git conflict files (supports 2-way and diff3 markers)
pub fn parse_conflict_content(path: &str, content: &str) -> ParsedConflictFile {
    let crlf = content.contains("\r\n");
    let newline = if crlf { "\r\n" } else { "\n" };

    let mut blocks = Vec::new();
    let mut clean_lines: Vec<String> = Vec::new();

    let mut state = ParserState::Outside;
    let mut block_id = 0;

    let mut current_start_line = 0;
    let mut current_base: Option<Vec<String>> = None;
    let mut current_ours: Vec<String> = Vec::new();
    let mut current_theirs: Vec<String> = Vec::new();

    let lines: Vec<&str> = content.split('\n').collect();

    for (idx, line_raw) in lines.iter().enumerate() {
        let line = line_raw.trim_end_matches('\r');
        let line_num = idx + 1;

        match state {
            ParserState::Outside => {
                if is_marker_start(line, "<<<<<<<") {
                    state = ParserState::InOurs;
                    current_start_line = line_num;
                    current_base = None;
                    current_ours.clear();
                    current_theirs.clear();
                } else {
                    clean_lines.push(line.to_string());
                }
            }
            ParserState::InOurs => {
                if is_marker_start(line, "|||||||") {
                    state = ParserState::InBase;
                    current_base = Some(Vec::new());
                } else if is_marker_start(line, "=======") {
                    state = ParserState::InTheirs;
                } else {
                    current_ours.push(line.to_string());
                }
            }
            ParserState::InBase => {
                if is_marker_start(line, "=======") {
                    state = ParserState::InTheirs;
                } else if let Some(ref mut base_lines) = current_base {
                    base_lines.push(line.to_string());
                }
            }
            ParserState::InTheirs => {
                if is_marker_start(line, ">>>>>>>") {
                    let ours_str = current_ours.join(newline);
                    let theirs_str = current_theirs.join(newline);
                    let base_str = current_base.as_ref().map(|b| b.join(newline));

                    let is_identical = ours_str == theirs_str;

                    blocks.push(ConflictBlock {
                        id: block_id,
                        base: base_str,
                        ours: ours_str.clone(),
                        theirs: theirs_str,
                        start_line: current_start_line,
                        end_line: line_num,
                        is_identical,
                    });
                    block_id += 1;

                    // If identical, automatically apply to suggestion; otherwise keep ours as baseline
                    if is_identical {
                        for l in &current_ours {
                            clean_lines.push(l.clone());
                        }
                    }

                    state = ParserState::Outside;
                } else {
                    current_theirs.push(line.to_string());
                }
            }
        }
    }

    let has_markers = !blocks.is_empty();
    let clean_text_suggestion = clean_lines.join(newline);

    ParsedConflictFile {
        path: path.to_string(),
        has_markers,
        crlf,
        blocks,
        clean_text_suggestion,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_standard_2way_conflict() {
        let content = "header line\n<<<<<<< HEAD\nline from ours\n=======\nline from theirs\n>>>>>>> feature\nfooter line";
        let parsed = parse_conflict_content("test.txt", content);

        assert!(parsed.has_markers);
        assert!(!parsed.crlf);
        assert_eq!(parsed.blocks.len(), 1);

        let block = &parsed.blocks[0];
        assert_eq!(block.ours, "line from ours");
        assert_eq!(block.theirs, "line from theirs");
        assert_eq!(block.base, None);
        assert!(!block.is_identical);
        assert_eq!(block.start_line, 2);
        assert_eq!(block.end_line, 6);
    }

    #[test]
    fn test_parse_diff3_conflict_with_base() {
        let content = "<<<<<<< HEAD\nmodified ours\n||||||| 1234567\ncommon base text\n=======\nmodified theirs\n>>>>>>> branch\n";
        let parsed = parse_conflict_content("diff3.txt", content);

        assert!(parsed.has_markers);
        assert_eq!(parsed.blocks.len(), 1);

        let block = &parsed.blocks[0];
        assert_eq!(block.ours, "modified ours");
        assert_eq!(block.base.as_deref(), Some("common base text"));
        assert_eq!(block.theirs, "modified theirs");
    }

    #[test]
    fn test_parse_crlf_and_identical_changes() {
        let content = "start\r\n<<<<<<< HEAD\r\nsame content\r\n=======\r\nsame content\r\n>>>>>>> other\r\nend";
        let parsed = parse_conflict_content("crlf.txt", content);

        assert!(parsed.crlf);
        assert_eq!(parsed.blocks.len(), 1);
        let block = &parsed.blocks[0];
        assert!(block.is_identical);
        assert_eq!(block.ours, "same content");

        // Suggestion should automatically contain the identical content
        assert!(parsed.clean_text_suggestion.contains("same content"));
    }

    #[test]
    fn test_contains_conflict_markers() {
        assert!(contains_conflict_markers("<<<<<<< HEAD\ncode\n=======\nother\n>>>>>>> ref"));
        assert!(!contains_conflict_markers("int x = (a <<<<<<< 2);"));
        assert!(!contains_conflict_markers("let y = a ======= b;"));
        assert!(!contains_conflict_markers("Normal clean code\nNo markers here"));
    }
}
