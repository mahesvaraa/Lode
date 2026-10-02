use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/git_ref_kind.ts")]
pub enum GitRefKind {
    LocalBranch,
    RemoteBranch,
    Tag,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/git_ref.ts")]
pub struct GitRef {
    pub name: String,
    pub full_ref: String,
    pub kind: GitRefKind,
    pub target_hash: String,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub is_head: bool,
    pub date: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/repo_refs.ts")]
pub struct RepoRefs {
    pub local_branches: Vec<GitRef>,
    pub remote_branches: Vec<GitRef>,
    pub tags: Vec<GitRef>,
    pub current_branch: Option<String>,
}

/// Pure parser for git for-each-ref output with tab and newline delimiters
pub fn parse_git_refs(raw_bytes: &[u8]) -> RepoRefs {
    let mut local_branches = Vec::new();
    let mut remote_branches = Vec::new();
    let mut tags = Vec::new();
    let mut current_branch = None;

    let records: Box<dyn Iterator<Item = &[u8]>> = if raw_bytes.contains(&0) {
        Box::new(raw_bytes.split(|&b| b == 0))
    } else {
        Box::new(raw_bytes.split(|&b| b == b'\n'))
    };

    for record in records {
        if record.is_empty() {
            continue;
        }

        let record_str = String::from_utf8_lossy(record);
        let fields: Vec<&str> = if record_str.contains('\t') {
            record_str.split('\t').collect()
        } else {
            record_str.split('\x1f').collect()
        };
        if fields.len() < 7 {
            continue;
        }

        let full_ref = fields[0].trim().to_string();
        if full_ref.is_empty() {
            continue;
        }

        let object_name = fields[1].trim().to_string();
        let upstream_raw = fields[2].trim();
        let upstream = if upstream_raw.is_empty() {
            None
        } else {
            Some(upstream_raw.to_string())
        };

        let (ahead, behind) = parse_upstream_track(fields[3]);
        let is_head = fields[4].trim() == "*";
        let date = fields[5].trim().parse::<i64>().unwrap_or(0);
        let peeled_object = fields[6].trim();

        // For annotated tags, use peeled object if available
        let target_hash = if !peeled_object.is_empty() {
            peeled_object.to_string()
        } else {
            object_name
        };

        if let Some(name) = full_ref.strip_prefix("refs/heads/") {
            let ref_item = GitRef {
                name: name.to_string(),
                full_ref: full_ref.clone(),
                kind: GitRefKind::LocalBranch,
                target_hash,
                upstream,
                ahead,
                behind,
                is_head,
                date,
            };
            if is_head {
                current_branch = Some(name.to_string());
            }
            local_branches.push(ref_item);
        } else if let Some(name) = full_ref.strip_prefix("refs/remotes/") {
            // Ignore remotes/origin/HEAD symref
            if name.ends_with("/HEAD") {
                continue;
            }
            let ref_item = GitRef {
                name: name.to_string(),
                full_ref: full_ref.clone(),
                kind: GitRefKind::RemoteBranch,
                target_hash,
                upstream: None,
                ahead: 0,
                behind: 0,
                is_head: false,
                date,
            };
            remote_branches.push(ref_item);
        } else if let Some(name) = full_ref.strip_prefix("refs/tags/") {
            let ref_item = GitRef {
                name: name.to_string(),
                full_ref: full_ref.clone(),
                kind: GitRefKind::Tag,
                target_hash,
                upstream: None,
                ahead: 0,
                behind: 0,
                is_head: false,
                date,
            };
            tags.push(ref_item);
        }
    }

    RepoRefs {
        local_branches,
        remote_branches,
        tags,
        current_branch,
    }
}

/// Parses track string like "[ahead 1, behind 2]" or "[ahead 3]"
fn parse_upstream_track(track_str: &str) -> (u32, u32) {
    let mut ahead = 0;
    let mut behind = 0;

    let clean = track_str.trim().trim_matches(|c| c == '[' || c == ']');
    for part in clean.split(',') {
        let p = part.trim();
        if let Some(n_str) = p.strip_prefix("ahead ") {
            ahead = n_str.trim().parse::<u32>().unwrap_or(0);
        } else if let Some(n_str) = p.strip_prefix("behind ") {
            behind = n_str.trim().parse::<u32>().unwrap_or(0);
        }
    }

    (ahead, behind)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_refs_comprehensive() {
        let mut raw = Vec::new();

        // 1. Current branch with slashes and tracking
        raw.extend_from_slice(b"refs/heads/feature/ui/modal\x1f1111111111111111111111111111111111111111\x1forigin/feature/ui/modal\x1f[ahead 2, behind 1]\x1f*\x1f1700000000\x1f\x00");

        // 2. Local branch with Cyrillic
        raw.extend_from_slice(b"refs/heads/\xD1\x84\xD0\xB8\xD1\x87\xD0\xB0-\xD1\x82\xD0\xB5\xD1\x81\xD1\x82\x1f2222222222222222222222222222222222222222\x1f\x1f\x1f \x1f1700001000\x1f\x00");

        // 3. Remote branch
        raw.extend_from_slice(b"refs/remotes/origin/main\x1f3333333333333333333333333333333333333333\x1f\x1f\x1f \x1f1700002000\x1f\x00");

        // 4. Remote HEAD (should be ignored)
        raw.extend_from_slice(b"refs/remotes/origin/HEAD\x1f3333333333333333333333333333333333333333\x1f\x1f\x1f \x1f1700002000\x1f\x00");

        // 5. Annotated Tag with peeled hash
        raw.extend_from_slice(b"refs/tags/v1.0.0\x1ftag_object_hash_444444444444444444444444\x1f\x1f\x1f \x1f1700003000\x1fcommit_hash_555555555555555555555555\x00");

        let refs = parse_git_refs(&raw);

        // Local branches
        assert_eq!(refs.local_branches.len(), 2);
        let b1 = &refs.local_branches[0];
        assert_eq!(b1.name, "feature/ui/modal");
        assert!(b1.is_head);
        assert_eq!(b1.upstream, Some("origin/feature/ui/modal".to_string()));
        assert_eq!(b1.ahead, 2);
        assert_eq!(b1.behind, 1);

        let b2 = &refs.local_branches[1];
        assert_eq!(b2.name, "фича-тест");
        assert!(!b2.is_head);

        assert_eq!(refs.current_branch, Some("feature/ui/modal".to_string()));

        // Remote branches
        assert_eq!(refs.remote_branches.len(), 1);
        assert_eq!(refs.remote_branches[0].name, "origin/main");

        // Tags
        assert_eq!(refs.tags.len(), 1);
        assert_eq!(refs.tags[0].name, "v1.0.0");
        assert_eq!(
            refs.tags[0].target_hash,
            "commit_hash_555555555555555555555555"
        );
    }
}
