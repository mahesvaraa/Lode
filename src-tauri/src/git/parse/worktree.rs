use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/worktree_info.ts")]
pub struct WorktreeInfo {
    pub path: String,
    pub head: String,
    pub branch: Option<String>,
    pub is_bare: bool,
    pub is_detached: bool,
    pub is_locked: bool,
    pub lock_reason: Option<String>,
    pub is_main: bool,
}

pub fn parse_worktree_list(output: &[u8]) -> Vec<WorktreeInfo> {
    let text = String::from_utf8_lossy(output);
    let mut worktrees = Vec::new();

    let mut current_path: Option<String> = None;
    let mut current_head = String::new();
    let mut current_branch: Option<String> = None;
    let mut is_bare = false;
    let mut is_detached = false;
    let mut is_locked = false;
    let mut lock_reason: Option<String> = None;

    let flush_entry = |path: Option<String>,
                           head: String,
                           branch: Option<String>,
                           bare: bool,
                           detached: bool,
                           locked: bool,
                           reason: Option<String>,
                           is_first: bool|
     -> Option<WorktreeInfo> {
        path.map(|p| WorktreeInfo {
            path: p,
            head,
            branch,
            is_bare: bare,
            is_detached: detached,
            is_locked: locked,
            lock_reason: reason,
            is_main: is_first,
        })
    };

    let mut is_first = true;

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if let Some(wt) = flush_entry(
                current_path.take(),
                std::mem::take(&mut current_head),
                current_branch.take(),
                is_bare,
                is_detached,
                is_locked,
                lock_reason.take(),
                is_first,
            ) {
                worktrees.push(wt);
                is_first = false;
            }
            is_bare = false;
            is_detached = false;
            is_locked = false;
            continue;
        }

        if let Some(path) = trimmed.strip_prefix("worktree ") {
            current_path = Some(path.to_string());
        } else if let Some(head) = trimmed.strip_prefix("HEAD ") {
            current_head = head.to_string();
        } else if let Some(branch_ref) = trimmed.strip_prefix("branch ") {
            let branch_name = branch_ref
                .strip_prefix("refs/heads/")
                .unwrap_or(branch_ref)
                .to_string();
            current_branch = Some(branch_name);
        } else if trimmed == "bare" {
            is_bare = true;
        } else if trimmed == "detached" {
            is_detached = true;
        } else if let Some(reason) = trimmed.strip_prefix("locked") {
            is_locked = true;
            let reason_str = reason.trim();
            if !reason_str.is_empty() {
                lock_reason = Some(reason_str.to_string());
            }
        }
    }

    if let Some(wt) = flush_entry(
        current_path.take(),
        current_head,
        current_branch.take(),
        is_bare,
        is_detached,
        is_locked,
        lock_reason.take(),
        is_first,
    ) {
        worktrees.push(wt);
    }

    worktrees
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_worktree_porcelain() {
        let raw = b"worktree /home/user/project\nHEAD 1111222233334444555566667777888899990000\nbranch refs/heads/main\n\nworktree /home/user/project-feature\nHEAD aaaa222233334444555566667777888899990000\nbranch refs/heads/feature/auth\n\nworktree /home/user/project-detached\nHEAD bbbb222233334444555566667777888899990000\ndetached\n\nworktree /home/user/project-locked\nHEAD cccc222233334444555566667777888899990000\nbranch refs/heads/locked-fix\nlocked reason text\n";

        let parsed = parse_worktree_list(raw);
        assert_eq!(parsed.len(), 4);

        assert_eq!(parsed[0].path, "/home/user/project");
        assert_eq!(parsed[0].branch.as_deref(), Some("main"));
        assert!(parsed[0].is_main);
        assert!(!parsed[0].is_detached);
        assert!(!parsed[0].is_locked);

        assert_eq!(parsed[1].path, "/home/user/project-feature");
        assert_eq!(parsed[1].branch.as_deref(), Some("feature/auth"));
        assert!(!parsed[1].is_main);

        assert_eq!(parsed[2].path, "/home/user/project-detached");
        assert!(parsed[2].is_detached);
        assert_eq!(parsed[2].branch, None);

        assert_eq!(parsed[3].path, "/home/user/project-locked");
        assert!(parsed[3].is_locked);
        assert_eq!(parsed[3].lock_reason.as_deref(), Some("reason text"));
    }
}
