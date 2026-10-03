use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/stash_item.ts")]
pub struct StashItem {
    pub index: usize,
    pub selector: String,
    pub message: String,
    pub date: i64,
    pub commit_hash: String,
}

/// Pure parser for `git stash list --format=%gd%x1f%H%x1f%at%x1f%gs%x00`
pub fn parse_git_stash_list(raw_bytes: &[u8]) -> Vec<StashItem> {
    let mut items = Vec::new();

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
        let fields: Vec<&str> = if record_str.contains('\x1f') {
            record_str.split('\x1f').collect()
        } else {
            record_str.split('\t').collect()
        };

        if fields.len() < 4 {
            continue;
        }

        let selector = fields[0].trim().to_string();
        let commit_hash = fields[1].trim().to_string();
        let date = fields[2].trim().parse::<i64>().unwrap_or(0);
        let message = fields[3].trim().to_string();

        // Extract index from stash@{0}
        let index = selector
            .strip_prefix("stash@{")
            .and_then(|s| s.strip_suffix('}'))
            .and_then(|s| s.parse::<usize>().ok())
            .unwrap_or(items.len());

        items.push(StashItem {
            index,
            selector,
            message,
            date,
            commit_hash,
        });
    }

    items
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_stash_list() {
        let input = b"stash@{0}\x1f92a34bc\x1f1700000000\x1fWIP on main: 1234567 feat\x00stash@{1}\x1f88b12cf\x1f1699999000\x1fOn feature: save work\x00";
        let items = parse_git_stash_list(input);
        assert_eq!(items.len(), 2);

        assert_eq!(items[0].index, 0);
        assert_eq!(items[0].selector, "stash@{0}");
        assert_eq!(items[0].commit_hash, "92a34bc");
        assert_eq!(items[0].date, 1700000000);
        assert_eq!(items[0].message, "WIP on main: 1234567 feat");

        assert_eq!(items[1].index, 1);
        assert_eq!(items[1].selector, "stash@{1}");
        assert_eq!(items[1].commit_hash, "88b12cf");
    }
}
