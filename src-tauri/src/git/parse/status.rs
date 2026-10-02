use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/file_status_kind.ts")]
pub enum FileStatusKind {
    Modified,
    Added,
    Deleted,
    Renamed,
    Copied,
    Untracked,
    Ignored,
    Conflicted,
    TypeChanged,
}

impl FileStatusKind {
    pub fn from_char(c: char) -> Option<Self> {
        match c {
            'M' => Some(Self::Modified),
            'A' => Some(Self::Added),
            'D' => Some(Self::Deleted),
            'R' => Some(Self::Renamed),
            'C' => Some(Self::Copied),
            '?' => Some(Self::Untracked),
            '!' => Some(Self::Ignored),
            'U' => Some(Self::Conflicted),
            'T' => Some(Self::TypeChanged),
            _ => None,
        }
    }

    pub fn to_code(&self) -> &'static str {
        match self {
            Self::Modified => "M",
            Self::Added => "A",
            Self::Deleted => "D",
            Self::Renamed => "R",
            Self::Copied => "C",
            Self::Untracked => "?",
            Self::Ignored => "!",
            Self::Conflicted => "U",
            Self::TypeChanged => "T",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, Default)]
#[ts(export, export_to = "../../src/api/types/branch_info.ts")]
pub struct BranchInfo {
    pub oid: Option<String>,
    pub head: Option<String>,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub is_detached: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/status_item.ts")]
pub struct StatusItem {
    pub path: String,
    pub orig_path: Option<String>,
    pub status: FileStatusKind,
    pub is_staged: bool,
    pub is_conflicted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, Default)]
#[ts(export, export_to = "../../src/api/types/repo_status.ts")]
pub struct RepoStatus {
    pub branch: BranchInfo,
    pub staged: Vec<StatusItem>,
    pub unstaged: Vec<StatusItem>,
    pub conflicts: Vec<StatusItem>,
}

/// Pure parser for `git status --porcelain=v2 -z --branch`
pub fn parse_status_porcelain_v2(output: &[u8]) -> RepoStatus {
    let mut branch = BranchInfo::default();
    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut conflicts = Vec::new();

    // Split raw bytes by NUL (\0)
    let entries: Vec<&[u8]> = output
        .split(|&b| b == 0)
        .filter(|e| !e.is_empty())
        .collect();

    let mut i = 0;
    while i < entries.len() {
        let entry_bytes = entries[i];
        let entry_str = String::from_utf8_lossy(entry_bytes);
        i += 1;

        if entry_str.starts_with("# ") {
            // Header lines
            parse_branch_header(&entry_str, &mut branch);
            continue;
        }

        if let Some(path_str) = entry_str.strip_prefix("? ") {
            // Untracked: "? <path>"
            unstaged.push(StatusItem {
                path: path_str.to_string(),
                orig_path: None,
                status: FileStatusKind::Untracked,
                is_staged: false,
                is_conflicted: false,
            });
            continue;
        }

        if entry_str.starts_with("! ") {
            // Ignored
            continue;
        }

        if entry_str.starts_with("1 ") {
            // Ordinary change: "1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>"
            let parts: Vec<&str> = entry_str.splitn(9, ' ').collect();
            if parts.len() == 9 {
                let xy = parts[1];
                let path = parts[8].to_string();
                handle_xy_status(xy, path, None, &mut staged, &mut unstaged);
            }
            continue;
        }

        if entry_str.starts_with("2 ") {
            // Renamed/Copied: "2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X><score> <path>"
            // Followed immediately by the original path in the next NUL entry!
            let parts: Vec<&str> = entry_str.splitn(10, ' ').collect();
            if parts.len() == 10 {
                let xy = parts[1];
                let path = parts[9].to_string();
                let orig_path = if i < entries.len() {
                    let p = String::from_utf8_lossy(entries[i]).to_string();
                    i += 1;
                    Some(p)
                } else {
                    None
                };
                handle_xy_status(xy, path, orig_path, &mut staged, &mut unstaged);
            }
            continue;
        }

        if entry_str.starts_with("u ") {
            // Unmerged (conflict): "u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path>"
            let parts: Vec<&str> = entry_str.splitn(11, ' ').collect();
            if parts.len() == 11 {
                let path = parts[10].to_string();
                let item = StatusItem {
                    path,
                    orig_path: None,
                    status: FileStatusKind::Conflicted,
                    is_staged: false,
                    is_conflicted: true,
                };
                conflicts.push(item);
            }
            continue;
        }
    }

    RepoStatus {
        branch,
        staged,
        unstaged,
        conflicts,
    }
}

fn parse_branch_header(line: &str, branch: &mut BranchInfo) {
    if let Some(oid) = line.strip_prefix("# branch.oid ") {
        if oid != "(initial)" {
            branch.oid = Some(oid.trim().to_string());
        }
    } else if let Some(head) = line.strip_prefix("# branch.head ") {
        let trimmed = head.trim();
        if trimmed == "(detached)" {
            branch.is_detached = true;
            branch.head = Some("HEAD (detached)".to_string());
        } else {
            branch.head = Some(trimmed.to_string());
        }
    } else if let Some(upstream) = line.strip_prefix("# branch.upstream ") {
        branch.upstream = Some(upstream.trim().to_string());
    } else if let Some(ab) = line.strip_prefix("# branch.ab ") {
        // e.g. "+1 -2"
        for part in ab.split_whitespace() {
            if let Some(ahead) = part.strip_prefix('+') {
                branch.ahead = ahead.parse::<u32>().unwrap_or(0);
            } else if let Some(behind) = part.strip_prefix('-') {
                branch.behind = behind.parse::<u32>().unwrap_or(0);
            }
        }
    }
}

fn handle_xy_status(
    xy: &str,
    path: String,
    orig_path: Option<String>,
    staged: &mut Vec<StatusItem>,
    unstaged: &mut Vec<StatusItem>,
) {
    let mut chars = xy.chars();
    let x = chars.next().unwrap_or('.');
    let y = chars.next().unwrap_or('.');

    // X is staging area
    if x != '.' {
        if let Some(kind) = FileStatusKind::from_char(x) {
            staged.push(StatusItem {
                path: path.clone(),
                orig_path: orig_path.clone(),
                status: kind,
                is_staged: true,
                is_conflicted: false,
            });
        }
    }

    // Y is working tree
    if y != '.' {
        if let Some(kind) = FileStatusKind::from_char(y) {
            unstaged.push(StatusItem {
                path,
                orig_path,
                status: kind,
                is_staged: false,
                is_conflicted: false,
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_clean_status() {
        let input = b"# branch.oid 7be02d4\0# branch.head main\0# branch.upstream origin/main\0# branch.ab +0 -0\0";
        let status = parse_status_porcelain_v2(input);
        assert_eq!(status.branch.head, Some("main".to_string()));
        assert_eq!(status.branch.upstream, Some("origin/main".to_string()));
        assert_eq!(status.branch.ahead, 0);
        assert_eq!(status.branch.behind, 0);
        assert!(status.staged.is_empty());
        assert!(status.unstaged.is_empty());
    }

    #[test]
    fn test_parse_mixed_changes_and_partially_staged() {
        // MM = staged and unstaged, A. = staged addition, .D = unstaged deletion, ? = untracked
        let input = b"# branch.oid a1b2c3d\0# branch.head feature/test\01 MM N... 100644 100644 100644 e69de29 e69de29 src/app.ts\01 A. N... 000000 100644 100644 0000000 e69de29 src/new.ts\01 .D N... 100644 100644 000000 e69de29 0000000 src/old.ts\0? untracked_file.txt\0";
        let status = parse_status_porcelain_v2(input);

        // Staged list should have src/app.ts (M) and src/new.ts (A)
        assert_eq!(status.staged.len(), 2);
        assert_eq!(status.staged[0].path, "src/app.ts");
        assert_eq!(status.staged[0].status, FileStatusKind::Modified);
        assert_eq!(status.staged[1].path, "src/new.ts");
        assert_eq!(status.staged[1].status, FileStatusKind::Added);

        // Unstaged list should have src/app.ts (M), src/old.ts (D), and untracked_file.txt (?)
        assert_eq!(status.unstaged.len(), 3);
        assert_eq!(status.unstaged[0].path, "src/app.ts");
        assert_eq!(status.unstaged[0].status, FileStatusKind::Modified);
        assert_eq!(status.unstaged[1].path, "src/old.ts");
        assert_eq!(status.unstaged[1].status, FileStatusKind::Deleted);
        assert_eq!(status.unstaged[2].path, "untracked_file.txt");
        assert_eq!(status.unstaged[2].status, FileStatusKind::Untracked);
    }

    #[test]
    fn test_parse_renamed_file_with_spaces() {
        // Record 2: rename, second NUL record is origPath
        let input = b"# branch.head main\02 R. N... 100644 100644 100644 e69de29 e69de29 R100 docs/new manual.md\0docs/old guide.md\0";
        let status = parse_status_porcelain_v2(input);

        assert_eq!(status.staged.len(), 1);
        let item = &status.staged[0];
        assert_eq!(item.path, "docs/new manual.md");
        assert_eq!(item.orig_path, Some("docs/old guide.md".to_string()));
        assert_eq!(item.status, FileStatusKind::Renamed);
    }

    #[test]
    fn test_parse_conflicted_file() {
        let input = b"# branch.head main\0u UU N... 100644 100644 100644 100644 e69de29 e69de29 e69de29 src/conflict.rs\0";
        let status = parse_status_porcelain_v2(input);

        assert_eq!(status.conflicts.len(), 1);
        assert_eq!(status.conflicts[0].path, "src/conflict.rs");
        assert_eq!(status.conflicts[0].status, FileStatusKind::Conflicted);
        assert!(status.conflicts[0].is_conflicted);
    }
}
