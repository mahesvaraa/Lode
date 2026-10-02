use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::AppError;
use crate::git::GitRunner;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/repo_state_kind.ts")]
pub enum RepoStateKind {
    Normal,
    Merge,
    Rebase,
    CherryPick,
    Revert,
    Bisect,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/repo_state.ts")]
pub struct RepoState {
    pub kind: RepoStateKind,
    pub step: Option<u32>,
    pub total_steps: Option<u32>,
    pub head_name: Option<String>,
    pub onto: Option<String>,
    pub message: String,
}

impl Default for RepoState {
    fn default() -> Self {
        Self {
            kind: RepoStateKind::Normal,
            step: None,
            total_steps: None,
            head_name: None,
            onto: None,
            message: String::new(),
        }
    }
}

/// Detects active repository state by querying Git-provided paths according to Section 8
pub async fn detect_repo_state(runner: &GitRunner, repo_path: &Path) -> Result<RepoState, AppError> {
    let args = [
        "rev-parse",
        "--git-path", "MERGE_HEAD",
        "--git-path", "rebase-merge",
        "--git-path", "rebase-apply",
        "--git-path", "CHERRY_PICK_HEAD",
        "--git-path", "REVERT_HEAD",
        "--git-path", "BISECT_LOG",
    ];

    let output = runner.run_read(Some(repo_path), &args).await?;
    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let paths: Vec<&str> = stdout_str.lines().collect();

    if paths.len() < 6 {
        return Ok(RepoState::default());
    }

    let resolve_path = |raw: &str| -> PathBuf {
        let p = Path::new(raw.trim());
        if p.is_absolute() {
            p.to_path_buf()
        } else {
            repo_path.join(p)
        }
    };

    let merge_head = resolve_path(paths[0]);
    let rebase_merge = resolve_path(paths[1]);
    let rebase_apply = resolve_path(paths[2]);
    let cherry_pick_head = resolve_path(paths[3]);
    let revert_head = resolve_path(paths[4]);
    let bisect_log = resolve_path(paths[5]);

    // 1. Rebase (rebase-merge)
    if rebase_merge.is_dir() {
        let step = read_file_u32(&rebase_merge.join("msgnum"));
        let total = read_file_u32(&rebase_merge.join("end"));
        let head_name = read_file_string(&rebase_merge.join("head-name"));
        let onto = read_file_string(&rebase_merge.join("onto"));

        let step_desc = match (step, total) {
            (Some(s), Some(t)) => format!(" (шаг {s} из {t})"),
            _ => String::new(),
        };

        return Ok(RepoState {
            kind: RepoStateKind::Rebase,
            step,
            total_steps: total,
            head_name,
            onto,
            message: format!("Идёт перебазирование (rebase){step_desc}"),
        });
    }

    // 2. Rebase (rebase-apply)
    if rebase_apply.is_dir() {
        let step = read_file_u32(&rebase_apply.join("next"));
        let total = read_file_u32(&rebase_apply.join("last"));
        let head_name = read_file_string(&rebase_apply.join("head-name"));

        let step_desc = match (step, total) {
            (Some(s), Some(t)) => format!(" (шаг {s} из {t})"),
            _ => String::new(),
        };

        return Ok(RepoState {
            kind: RepoStateKind::Rebase,
            step,
            total_steps: total,
            head_name,
            onto: None,
            message: format!("Идёт перебазирование (rebase){step_desc}"),
        });
    }

    // 3. Merge
    if merge_head.is_file() {
        return Ok(RepoState {
            kind: RepoStateKind::Merge,
            step: None,
            total_steps: None,
            head_name: None,
            onto: None,
            message: "Идёт слияние веток (merge)".to_string(),
        });
    }

    // 4. Cherry-pick
    if cherry_pick_head.is_file() {
        return Ok(RepoState {
            kind: RepoStateKind::CherryPick,
            step: None,
            total_steps: None,
            head_name: None,
            onto: None,
            message: "Идёт перенос коммита (cherry-pick)".to_string(),
        });
    }

    // 5. Revert
    if revert_head.is_file() {
        return Ok(RepoState {
            kind: RepoStateKind::Revert,
            step: None,
            total_steps: None,
            head_name: None,
            onto: None,
            message: "Идёт откат коммита (revert)".to_string(),
        });
    }

    // 6. Bisect
    if bisect_log.is_file() {
        return Ok(RepoState {
            kind: RepoStateKind::Bisect,
            step: None,
            total_steps: None,
            head_name: None,
            onto: None,
            message: "Идёт бисекция (bisect)".to_string(),
        });
    }

    // Normal clean state
    Ok(RepoState::default())
}

fn read_file_string(path: &Path) -> Option<String> {
    fs::read_to_string(path).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

fn read_file_u32(path: &Path) -> Option<u32> {
    read_file_string(path).and_then(|s| s.parse::<u32>().ok())
}
