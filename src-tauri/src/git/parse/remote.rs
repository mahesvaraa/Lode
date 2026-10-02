use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/remote.ts")]
pub struct Remote {
    pub name: String,
    pub fetch_url: String,
    pub push_url: String,
    pub display_fetch_url: String,
    pub display_push_url: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/pull_mode.ts")]
pub enum PullMode {
    FfOnly,
    Merge,
    Rebase,
}

/// Masks credentials in remote URLs (e.g. "https://user:pass@host/repo.git" -> "https://***@host/repo.git")
pub fn mask_remote_url(url: &str) -> String {
    let trimmed = url.trim();
    if let Some((scheme, rest)) = trimmed.split_once("://") {
        if let Some((user_info, host_and_path)) = rest.split_once('@') {
            // Only mask if there is credential info before @
            if !user_info.is_empty() {
                return format!("{scheme}://***@{host_and_path}");
            }
        }
    }
    trimmed.to_string()
}

/// Pure parser for `git remote -v` output
pub fn parse_git_remotes(raw_bytes: &[u8]) -> Vec<Remote> {
    let text = String::from_utf8_lossy(raw_bytes);
    let mut map: BTreeMap<String, (String, String)> = BTreeMap::new();

    for line in text.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let name = parts[0].to_string();
        let url = parts[1].to_string();
        let kind = parts[2]; // "(fetch)" or "(push)"

        let entry = map.entry(name).or_insert_with(|| (String::new(), String::new()));
        if kind.contains("fetch") {
            entry.0 = url;
        } else if kind.contains("push") {
            entry.1 = url;
        }
    }

    map.into_iter()
        .map(|(name, (fetch_url, push_url))| {
            let display_fetch_url = mask_remote_url(&fetch_url);
            let display_push_url = mask_remote_url(&push_url);
            Remote {
                name,
                fetch_url,
                push_url,
                display_fetch_url,
                display_push_url,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_remote_url() {
        // HTTPS with username and password
        assert_eq!(
            mask_remote_url("https://user:secret123@github.com/owner/repo.git"),
            "https://***@github.com/owner/repo.git"
        );

        // HTTP with token
        assert_eq!(
            mask_remote_url("http://ghp_abc123token@gitlab.corp.ru/team/project.git"),
            "http://***@gitlab.corp.ru/team/project.git"
        );

        // SSH URLs should remain unmasked
        assert_eq!(
            mask_remote_url("git@github.com:owner/repo.git"),
            "git@github.com:owner/repo.git"
        );
        assert_eq!(
            mask_remote_url("ssh://git@host.com:2222/repo.git"),
            "ssh://***@host.com:2222/repo.git"
        );

        // Clean public HTTPS URL without credentials
        assert_eq!(
            mask_remote_url("https://github.com/owner/repo.git"),
            "https://github.com/owner/repo.git"
        );
    }

    #[test]
    fn test_parse_git_remotes() {
        let input = b"origin\thttps://user:pass@github.com/test/repo.git (fetch)\norigin\thttps://user:pass@github.com/test/repo.git (push)\nupstream\tgit@github.com:upstream/repo.git (fetch)\nupstream\tgit@github.com:upstream/repo.git (push)\n";

        let remotes = parse_git_remotes(input);
        assert_eq!(remotes.len(), 2);

        let r1 = &remotes[0];
        assert_eq!(r1.name, "origin");
        assert_eq!(r1.fetch_url, "https://user:pass@github.com/test/repo.git");
        assert_eq!(r1.display_fetch_url, "https://***@github.com/test/repo.git");

        let r2 = &remotes[1];
        assert_eq!(r2.name, "upstream");
        assert_eq!(r2.fetch_url, "git@github.com:upstream/repo.git");
        assert_eq!(r2.display_fetch_url, "git@github.com:upstream/repo.git");
    }
}
