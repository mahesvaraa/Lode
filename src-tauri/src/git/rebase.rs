use std::collections::HashMap;
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/rebase_action_kind.ts")]
pub enum RebaseActionKind {
    Pick,
    Reword,
    Squash,
    Fixup,
    Drop,
}

impl RebaseActionKind {
    pub fn to_git_str(&self) -> &'static str {
        match self {
            Self::Pick => "pick",
            Self::Reword => "reword",
            Self::Squash => "squash",
            Self::Fixup => "fixup",
            Self::Drop => "drop",
        }
    }

    pub fn from_git_str(s: &str) -> Option<Self> {
        match s {
            "p" | "pick" => Some(Self::Pick),
            "r" | "reword" => Some(Self::Reword),
            "s" | "squash" => Some(Self::Squash),
            "f" | "fixup" => Some(Self::Fixup),
            "d" | "drop" => Some(Self::Drop),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/rebase_todo_item.ts")]
pub struct RebaseTodoItem {
    pub action: RebaseActionKind,
    pub hash: String,
    pub short_hash: String,
    pub subject: String,
    pub author_name: String,
    pub is_published: bool,
    pub reword_message: Option<String>,
}

/// Generates git-rebase-todo formatted text from items
pub fn generate_rebase_todo_text(items: &[RebaseTodoItem]) -> String {
    let mut out = String::new();
    for item in items {
        out.push_str(item.action.to_git_str());
        out.push(' ');
        out.push_str(&item.short_hash);
        out.push(' ');
        out.push_str(&item.subject);
        out.push('\n');
    }
    out
}

/// Entry point executed when application is invoked as helper CLI:
/// `lode --rebase-helper <sequence|editor> <target_file>`
pub fn run_rebase_helper(args: &[String]) {
    if args.len() < 2 {
        std::process::exit(1);
    }

    let mode = &args[0];
    let target_file = &args[1];

    if mode == "sequence" {
        // Replace git-rebase-todo with our prepared todo file
        if let Ok(source_path) = std::env::var("LODE_REBASE_TODO_FILE") {
            if let Ok(content) = fs::read_to_string(&source_path) {
                let _ = fs::write(target_file, content);
            }
        }
        std::process::exit(0);
    } else if mode == "editor" {
        // We are editing COMMIT_EDITMSG for a reword or squash step
        if let Ok(rewords_json_path) = std::env::var("LODE_REBASE_REWORDS_FILE") {
            if let Ok(data) = fs::read_to_string(&rewords_json_path) {
                if let Ok(rewords_map) = serde_json::from_str::<HashMap<String, String>>(&data) {
                    // Try to find the stopped SHA from .git/rebase-merge/stopped-sha
                    let target_path = Path::new(target_file);
                    let mut matched_message: Option<String> = None;

                    if let Some(parent) = target_path.parent() {
                        let stopped_sha_path = if parent.ends_with("rebase-merge") {
                            parent.join("stopped-sha")
                        } else {
                            parent.join(".git").join("rebase-merge").join("stopped-sha")
                        };

                        if let Ok(sha) = fs::read_to_string(&stopped_sha_path) {
                            let sha_trim = sha.trim();
                            for (key, msg) in &rewords_map {
                                if sha_trim.starts_with(key) || key.starts_with(sha_trim) {
                                    matched_message = Some(msg.clone());
                                    break;
                                }
                            }
                        }
                    }

                    // Fallback: match by subject in original COMMIT_EDITMSG
                    if matched_message.is_none() {
                        if let Ok(original_content) = fs::read_to_string(target_file) {
                            let first_line = original_content.lines().next().unwrap_or("").trim();
                            for (key, msg) in &rewords_map {
                                if first_line.contains(key) || key.contains(first_line) {
                                    matched_message = Some(msg.clone());
                                    break;
                                }
                            }
                        }
                    }

                    if let Some(new_msg) = matched_message {
                        let _ = fs::write(target_file, new_msg);
                    }
                }
            }
        }
        std::process::exit(0);
    }

    std::process::exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_rebase_todo_text() {
        let items = vec![
            RebaseTodoItem {
                action: RebaseActionKind::Pick,
                hash: "a1b2c3d4e5f6".into(),
                short_hash: "a1b2c3d".into(),
                subject: "First commit".into(),
                author_name: "Author".into(),
                is_published: false,
                reword_message: None,
            },
            RebaseTodoItem {
                action: RebaseActionKind::Squash,
                hash: "f6e5d4c3b2a1".into(),
                short_hash: "f6e5d4c".into(),
                subject: "Second commit".into(),
                author_name: "Author".into(),
                is_published: false,
                reword_message: None,
            },
            RebaseTodoItem {
                action: RebaseActionKind::Drop,
                hash: "112233445566".into(),
                short_hash: "1122334".into(),
                subject: "Third commit".into(),
                author_name: "Author".into(),
                is_published: false,
                reword_message: None,
            },
        ];

        let text = generate_rebase_todo_text(&items);
        assert_eq!(
            text,
            "pick a1b2c3d First commit\nsquash f6e5d4c Second commit\ndrop 1122334 Third commit\n"
        );
    }
}
