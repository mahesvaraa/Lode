use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/blame_line.ts")]
pub struct BlameLine {
    pub line_number: usize,
    pub commit_hash: String,
    pub author_name: String,
    pub author_time: i64,
    pub summary: String,
    pub content: String,
}

#[derive(Default, Clone)]
struct CommitMeta {
    author: String,
    time: i64,
    summary: String,
}

/// Pure parser for `git blame --porcelain -- <path>`
pub fn parse_git_blame_porcelain(raw_bytes: &[u8]) -> Vec<BlameLine> {
    let text = String::from_utf8_lossy(raw_bytes);
    let mut lines = Vec::new();

    let mut commit_cache: HashMap<String, CommitMeta> = HashMap::new();

    let mut current_hash = String::new();
    let mut current_line_num: usize = 0;
    let mut current_meta = CommitMeta::default();

    for line in text.lines() {
        if let Some(content) = line.strip_prefix('\t') {
            // This is the line content, which ends a blame entry block
            let meta = commit_cache
                .get(&current_hash)
                .cloned()
                .unwrap_or(current_meta);

            lines.push(BlameLine {
                line_number: current_line_num,
                commit_hash: current_hash.clone(),
                author_name: meta.author,
                author_time: meta.time,
                summary: meta.summary,
                content: content.to_string(),
            });

            current_meta = CommitMeta::default();
        } else if let Some(author) = line.strip_prefix("author ") {
            current_meta.author = author.trim().to_string();
            commit_cache.entry(current_hash.clone()).or_default().author =
                current_meta.author.clone();
        } else if let Some(time_str) = line.strip_prefix("author-time ") {
            current_meta.time = time_str.trim().parse::<i64>().unwrap_or(0);
            commit_cache.entry(current_hash.clone()).or_default().time = current_meta.time;
        } else if let Some(summary) = line.strip_prefix("summary ") {
            current_meta.summary = summary.trim().to_string();
            commit_cache.entry(current_hash.clone()).or_default().summary =
                current_meta.summary.clone();
        } else {
            // Check if this is the start of a block: <hex-hash> <orig_line> <final_line>
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3
                && parts[0].len() >= 7
                && parts[0].chars().all(|c| c.is_ascii_hexdigit())
                && parts[1].parse::<usize>().is_ok()
                && parts[2].parse::<usize>().is_ok()
            {
                current_hash = parts[0].to_string();
                current_line_num = parts[2].parse::<usize>().unwrap_or(lines.len() + 1);
            }
        }
    }

    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_blame_porcelain() {
        let input = b"53544de1cc9616533993b21f2bc1223a1f8b662b 1 1 2\nauthor Danil Shkirdov\nauthor-mail <danil@example.com>\nauthor-time 1790968281\nauthor-tz +0400\ncommitter Danil Shkirdov\ncommitter-mail <danil@example.com>\ncommitter-time 1790968281\ncommitter-tz +0400\nsummary feat: stage 0 - scaffold\nfilename package.json\n\t{\n53544de1cc9616533993b21f2bc1223a1f8b662b 2 2\n\t  \"name\": \"lode\"\n";

        let lines = parse_git_blame_porcelain(input);
        assert_eq!(lines.len(), 2);

        assert_eq!(lines[0].line_number, 1);
        assert_eq!(lines[0].commit_hash, "53544de1cc9616533993b21f2bc1223a1f8b662b");
        assert_eq!(lines[0].author_name, "Danil Shkirdov");
        assert_eq!(lines[0].author_time, 1790968281);
        assert_eq!(lines[0].summary, "feat: stage 0 - scaffold");
        assert_eq!(lines[0].content, "{");

        assert_eq!(lines[1].line_number, 2);
        assert_eq!(lines[1].commit_hash, "53544de1cc9616533993b21f2bc1223a1f8b662b");
        assert_eq!(lines[1].author_name, "Danil Shkirdov");
        assert_eq!(lines[1].content, "  \"name\": \"lode\"");
    }
}
