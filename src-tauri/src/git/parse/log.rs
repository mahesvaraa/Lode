use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/ref_kind.ts")]
pub enum RefKind {
    Head,
    LocalBranch,
    RemoteBranch,
    Tag,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/ref_chip.ts")]
pub struct RefChip {
    pub name: String,
    pub kind: RefKind,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/commit.ts")]
pub struct Commit {
    pub hash: String,
    pub short_hash: String,
    pub parents: Vec<String>,
    pub author_name: String,
    pub author_email: String,
    pub author_date: i64,
    pub committer_name: String,
    pub committer_email: String,
    pub committer_date: i64,
    pub refs: Vec<RefChip>,
    pub subject: String,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/commit_file.ts")]
pub struct CommitFile {
    pub path: String,
    pub status: String,
    pub old_path: Option<String>,
    pub additions: Option<u32>,
    pub deletions: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/commit_details.ts")]
pub struct CommitDetails {
    pub commit: Commit,
    pub files: Vec<CommitFile>,
    pub total_additions: u32,
    pub total_deletions: u32,
}

/// Pure parser for git log output formatted with %x1f and -z
pub fn parse_git_log(raw_bytes: &[u8]) -> Vec<Commit> {
    let mut commits = Vec::new();

    // Split records by NUL (\0)
    for record in raw_bytes.split(|&b| b == 0) {
        if record.is_empty() {
            continue;
        }

        let record_str = String::from_utf8_lossy(record);
        let fields: Vec<&str> = record_str.split('\x1f').collect();

        if fields.len() < 12 {
            continue;
        }

        let hash = fields[0].trim().to_string();
        if hash.is_empty() {
            continue;
        }

        let short_hash = fields[1].trim().to_string();
        let parents = fields[2]
            .split_whitespace()
            .map(|p| p.to_string())
            .collect();
        let author_name = fields[3].to_string();
        let author_email = fields[4].to_string();
        let author_date = fields[5].trim().parse::<i64>().unwrap_or(0);
        let committer_name = fields[6].to_string();
        let committer_email = fields[7].to_string();
        let committer_date = fields[8].trim().parse::<i64>().unwrap_or(0);
        let refs = parse_ref_chips(fields[9]);
        let subject = fields[10].to_string();
        let body = fields[11].trim().to_string();

        commits.push(Commit {
            hash,
            short_hash,
            parents,
            author_name,
            author_email,
            author_date,
            committer_name,
            committer_email,
            committer_date,
            refs,
            subject,
            body,
        });
    }

    commits
}

/// Parses the %D decorated refs string (e.g. "HEAD -> main, tag: v1.0.0, origin/main")
pub fn parse_ref_chips(refs_str: &str) -> Vec<RefChip> {
    let mut chips = Vec::new();
    let trimmed = refs_str.trim();
    if trimmed.is_empty() {
        return chips;
    }

    for item in trimmed.split(',') {
        let part = item.trim();
        if part.is_empty() {
            continue;
        }

        if let Some((head_part, target)) = part.split_once(" -> ") {
            chips.push(RefChip {
                name: head_part.trim().to_string(),
                kind: RefKind::Head,
            });
            chips.push(RefChip {
                name: target.trim().to_string(),
                kind: RefKind::LocalBranch,
            });
        } else if let Some(tag_name) = part.strip_prefix("tag: ") {
            chips.push(RefChip {
                name: tag_name.trim().to_string(),
                kind: RefKind::Tag,
            });
        } else if part == "HEAD" {
            chips.push(RefChip {
                name: "HEAD".to_string(),
                kind: RefKind::Head,
            });
        } else if part.contains('/') {
            chips.push(RefChip {
                name: part.to_string(),
                kind: RefKind::RemoteBranch,
            });
        } else {
            chips.push(RefChip {
                name: part.to_string(),
                kind: RefKind::LocalBranch,
            });
        }
    }

    chips
}

/// Pure parser for raw diff-tree / show files output (format: "M\0file.ts\0A\0file2.ts\0")
pub fn parse_commit_files(raw_bytes: &[u8]) -> Vec<CommitFile> {
    let mut files = Vec::new();
    let parts: Vec<&[u8]> = raw_bytes.split(|&b| b == 0).collect();

    let mut i = 0;
    while i < parts.len() {
        let status_bytes = parts[i];
        if status_bytes.is_empty() {
            i += 1;
            continue;
        }

        let status_str = String::from_utf8_lossy(status_bytes).trim().to_string();
        i += 1;

        if i < parts.len() {
            let path = String::from_utf8_lossy(parts[i]).to_string();
            i += 1;

            let mut old_path = None;
            // If rename or copy (e.g. R100), the next item is orig_path
            if (status_str.starts_with('R') || status_str.starts_with('C')) && i < parts.len() {
                old_path = Some(path.clone());
                let new_path = String::from_utf8_lossy(parts[i]).to_string();
                i += 1;
                files.push(CommitFile {
                    path: new_path,
                    status: status_str,
                    old_path,
                    additions: None,
                    deletions: None,
                });
                continue;
            }

            files.push(CommitFile {
                path,
                status: status_str,
                old_path,
                additions: None,
                deletions: None,
            });
        }
    }

    files
}

/// Pure parser for raw git show --numstat -z output
pub fn parse_numstat(raw_bytes: &[u8]) -> std::collections::HashMap<String, (Option<u32>, Option<u32>)> {
    let mut map = std::collections::HashMap::new();
    let records = raw_bytes.split(|&b| b == 0);

    for record in records {
        if record.is_empty() {
            continue;
        }
        let record_str = String::from_utf8_lossy(record);
        let parts: Vec<&str> = record_str.split('\t').collect();
        if parts.len() >= 3 {
            let additions = parts[0].trim().parse::<u32>().ok();
            let deletions = parts[1].trim().parse::<u32>().ok();
            let path = parts[2].trim().to_string();
            map.insert(path, (additions, deletions));
        }
    }

    map
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_commit_with_cyrillic_emoji_and_multiline_body() {
        let input = b"a1b2c3d4e5f6\x1fa1b2c3d\x1fparent1 parent2 parent3\x1f\xD0\x98\xD0\xB2\xD0\xB0\xD0\xBD\x1fivan@example.com\x1f1700000000\x1f\xD0\x98\xD0\xB2\xD0\xB0\xD0\xBD\x1fivan@example.com\x1f1700000000\x1fHEAD -> main, tag: v1.0.0\x1f\xD0\xA0\xD0\xB5\xD0\xBB\xD0\xB8\xD0\xB7 \xF0\x9F\x9A\x80 \xD0\xB8 \"\xD1\x84\xD0\xB8\xD1\x87\xD0\xB8\"\x1f\xD0\x9F\xD0\xB5\xD1\x80\xD0\xB2\xD0\xB0\xD1\x8F \xD1\x81\xD1\x82\xD1\x80\xD0\xBE\xD0\xBA\xD0\xB0\n\xD0\x92\xD1\x82\xD0\xBE\xD1\x80\xD0\xB0\xD1\x8F \xD1\x81\xD1\x82\xD1\x80\xD0\xBE\xD0\xBA\xD0\xB0\x00";

        let commits = parse_git_log(input);
        assert_eq!(commits.len(), 1);

        let c = &commits[0];
        assert_eq!(c.hash, "a1b2c3d4e5f6");
        assert_eq!(c.short_hash, "a1b2c3d");
        assert_eq!(c.parents, vec!["parent1", "parent2", "parent3"]); // Octopus merge
        assert_eq!(c.author_name, "Иван");
        assert_eq!(c.subject, "Релиз 🚀 и \"фичи\"");
        assert_eq!(c.body, "Первая строка\nВторая строка");
        assert_eq!(c.refs.len(), 3);
        assert_eq!(c.refs[0].name, "HEAD");
        assert_eq!(c.refs[1].name, "main");
        assert_eq!(c.refs[2].name, "v1.0.0");
        assert_eq!(c.refs[2].kind, RefKind::Tag);
    }

    #[test]
    fn test_parse_root_commit_with_empty_body() {
        let input = b"111111111111\x1f1111111\x1f\x1fAlice\x1falice@test.com\x1f1600000000\x1fAlice\x1falice@test.com\x1f1600000000\x1f\x1fInitial commit\x1f\x00";
        let commits = parse_git_log(input);
        assert_eq!(commits.len(), 1);

        let c = &commits[0];
        assert!(c.parents.is_empty());
        assert_eq!(c.subject, "Initial commit");
        assert!(c.body.is_empty());
        assert!(c.refs.is_empty());
    }

    #[test]
    fn test_parse_commit_files() {
        let input = b"M\0src/main.rs\0A\0README.md\0R100\0old.txt\0new.txt\0";
        let files = parse_commit_files(input);

        assert_eq!(files.len(), 3);
        assert_eq!(files[0].path, "src/main.rs");
        assert_eq!(files[0].status, "M");
        assert_eq!(files[1].path, "README.md");
        assert_eq!(files[1].status, "A");
        assert_eq!(files[2].path, "new.txt");
        assert_eq!(files[2].status, "R100");
        assert_eq!(files[2].old_path, Some("old.txt".to_string()));
    }

    #[test]
    fn test_parse_numstat() {
        let input = b"12\t4\tsrc/main.rs\0-\t-\timage.png\00\t5\tREADME.md\0";
        let stats = parse_numstat(input);

        assert_eq!(stats.len(), 3);
        assert_eq!(stats.get("src/main.rs"), Some(&(Some(12), Some(4))));
        assert_eq!(stats.get("image.png"), Some(&(None, None))); // binary file
        assert_eq!(stats.get("README.md"), Some(&(Some(0), Some(5))));
    }
}
