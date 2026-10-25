use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/submodule_info.ts")]
pub struct SubmoduleInfo {
    pub path: String,
    pub name: String,
    pub head: String,
    pub status_indicator: String,
    pub describe: Option<String>,
    pub is_initialized: bool,
    pub is_modified: bool,
    pub has_conflict: bool,
}

pub fn parse_submodule_status(output: &[u8]) -> Vec<SubmoduleInfo> {
    let text = String::from_utf8_lossy(output);
    let mut submodules = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim_end();
        if trimmed.is_empty() {
            continue;
        }

        // git submodule status output format:
        // [ -+U]<hash> <path> [(<describe>)]
        let first_char = trimmed.chars().next().unwrap_or(' ');
        let (status_indicator, rest) = if first_char == '-' || first_char == '+' || first_char == 'U' {
            (first_char.to_string(), &trimmed[1..])
        } else {
            (" ".to_string(), trimmed.trim_start())
        };

        let mut parts = rest.split_whitespace();
        let head = match parts.next() {
            Some(h) => h.to_string(),
            None => continue,
        };

        let path = match parts.next() {
            Some(p) => p.to_string(),
            None => continue,
        };

        let describe = if let Some(desc) = parts.next() {
            let desc_trimmed = desc.trim_start_matches('(').trim_end_matches(')');
            Some(desc_trimmed.to_string())
        } else {
            None
        };

        let is_initialized = status_indicator != "-";
        let is_modified = status_indicator == "+";
        let has_conflict = status_indicator == "U";
        let name = path.split('/').next_back().unwrap_or(&path).to_string();

        submodules.push(SubmoduleInfo {
            path,
            name,
            head,
            status_indicator,
            describe,
            is_initialized,
            is_modified,
            has_conflict,
        });
    }

    submodules
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_submodule_status() {
        let raw = b" 1111222233334444555566667777888899990000 vendor/lib1 (v1.0.0)\n-aaaa222233334444555566667777888899990000 vendor/lib2\n+bbbb222233334444555566667777888899990000 vendor/nested/lib3 (heads/main)\nUcccc222233334444555566667777888899990000 vendor/conflicted\n";

        let parsed = parse_submodule_status(raw);
        assert_eq!(parsed.len(), 4);

        // lib1: cleanly up to date
        assert_eq!(parsed[0].path, "vendor/lib1");
        assert_eq!(parsed[0].name, "lib1");
        assert_eq!(parsed[0].describe.as_deref(), Some("v1.0.0"));
        assert!(parsed[0].is_initialized);
        assert!(!parsed[0].is_modified);

        // lib2: uninitialized (-)
        assert_eq!(parsed[1].path, "vendor/lib2");
        assert_eq!(parsed[1].name, "lib2");
        assert!(!parsed[1].is_initialized);
        assert_eq!(parsed[1].status_indicator, "-");
        assert_eq!(parsed[1].describe, None);

        // lib3: modified (+)
        assert_eq!(parsed[2].path, "vendor/nested/lib3");
        assert_eq!(parsed[2].name, "lib3");
        assert!(parsed[2].is_initialized);
        assert!(parsed[2].is_modified);
        assert_eq!(parsed[2].status_indicator, "+");

        // conflicted (U)
        assert_eq!(parsed[3].path, "vendor/conflicted");
        assert!(parsed[3].has_conflict);
        assert_eq!(parsed[3].status_indicator, "U");
    }
}
