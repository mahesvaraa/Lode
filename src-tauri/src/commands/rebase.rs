use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::path::PathBuf;
use tauri::State;
use tempfile::NamedTempFile;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{parse_git_log, Commit};
use crate::git::rebase::{generate_rebase_todo_text, RebaseActionKind, RebaseTodoItem};
use crate::git::state::{detect_repo_state, RepoState};
use crate::git::GitRunner;

const LOG_FORMAT: &str =
    "--format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%ce%x1f%ct%x1f%D%x1f%s%x1f%b";

#[tauri::command]
pub async fn get_rebase_todo_list(
    repo_path: String,
    base_ref: String,
    runner: State<'_, GitRunner>,
) -> Result<Vec<RebaseTodoItem>, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    // 1. Check which commits are published on any remote
    let mut published_hashes = HashSet::new();
    if let Ok(rev_list_out) = runner
        .run_read(Some(&canonical), &["rev-list", "--remotes"])
        .await
    {
        for line in String::from_utf8_lossy(&rev_list_out.stdout).lines() {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                published_hashes.insert(trimmed.to_string());
            }
        }
    }

    // 2. Fetch the commits from base_ref..HEAD in chronological order (--reverse)
    let range = format!("{base_ref}..HEAD");
    let log_out = runner
        .run_read(
            Some(&canonical),
            &["log", "--reverse", "--date-order", "-z", LOG_FORMAT, &range],
        )
        .await?;

    let commits: Vec<Commit> = parse_git_log(&log_out.stdout);

    let items = commits
        .into_iter()
        .map(|c| {
            let is_published = published_hashes.contains(&c.hash);
            RebaseTodoItem {
                action: RebaseActionKind::Pick,
                hash: c.hash,
                short_hash: c.short_hash,
                subject: c.subject,
                author_name: c.author_name,
                is_published,
                reword_message: None,
            }
        })
        .collect();

    Ok(items)
}

#[tauri::command]
pub async fn start_interactive_rebase(
    repo_path: String,
    base_ref: String,
    items: Vec<RebaseTodoItem>,
    runner: State<'_, GitRunner>,
) -> Result<RepoState, AppError> {
    start_interactive_rebase_inner(&runner, &repo_path, &base_ref, items).await
}

pub async fn start_interactive_rebase_inner(
    runner: &GitRunner,
    repo_path: &str,
    base_ref: &str,
    items: Vec<RebaseTodoItem>,
) -> Result<RepoState, AppError> {
    let canonical = canonicalize_repo_path(repo_path)?;

    // 1. Prepare todo text and write to a temporary file
    let todo_content = generate_rebase_todo_text(&items);
    let mut temp_todo = NamedTempFile::new().map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось создать временный todo файл: {e}"),
            None,
        )
    })?;
    temp_todo.write_all(todo_content.as_bytes()).map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось записать во временный todo файл: {e}"),
            None,
        )
    })?;

    // 2. Prepare reword map and write to a temporary file
    let mut reword_map: HashMap<String, String> = HashMap::new();
    for item in &items {
        if item.action == RebaseActionKind::Reword {
            let msg = item
                .reword_message
                .as_deref()
                .unwrap_or(&item.subject)
                .to_string();
            reword_map.insert(item.hash.clone(), msg.clone());
            reword_map.insert(item.short_hash.clone(), msg.clone());
            reword_map.insert(item.subject.clone(), msg);
        }
    }

    let mut temp_reword = NamedTempFile::new().map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось создать временный rewords файл: {e}"),
            None,
        )
    })?;
    let rewords_json = serde_json::to_string(&reword_map).map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось сериализовать rewords map: {e}"),
            None,
        )
    })?;
    temp_reword
        .write_all(rewords_json.as_bytes())
        .map_err(|e| {
            AppError::new(
                ErrorKind::Io,
                format!("Не удалось записать во временный rewords файл: {e}"),
                None,
            )
        })?;

    // 3. Resolve helper command line
    let helper_exe = resolve_helper_exe()?;
    let exe_str = helper_exe.to_string_lossy().to_string();

    let is_standalone_helper = helper_exe
        .file_stem()
        .map(|s| s.to_string_lossy().contains("rebase_helper"))
        .unwrap_or(false);

    let (seq_editor, git_editor) = if is_standalone_helper {
        (
            format!("\"{}\" sequence", exe_str),
            format!("\"{}\" editor", exe_str),
        )
    } else {
        (
            format!("\"{}\" --rebase-helper sequence", exe_str),
            format!("\"{}\" --rebase-helper editor", exe_str),
        )
    };

    let todo_path_str = temp_todo.path().to_string_lossy().to_string();
    let rewords_path_str = temp_reword.path().to_string_lossy().to_string();

    let extra_envs = [
        ("LODE_REBASE_TODO_FILE", todo_path_str.as_str()),
        ("LODE_REBASE_REWORDS_FILE", rewords_path_str.as_str()),
        ("GIT_SEQUENCE_EDITOR", seq_editor.as_str()),
        ("GIT_EDITOR", git_editor.as_str()),
    ];

    // 4. Run git rebase -i <base_ref>
    let rebase_res = runner
        .run_write_env(&canonical, &["rebase", "-i", base_ref], &extra_envs)
        .await;

    // Detect state afterwards (e.g. if it paused on a conflict)
    let state = detect_repo_state(runner, &canonical).await?;

    if let Err(e) = rebase_res {
        // If state is Rebase, it paused on conflict which is expected for conflict scenarios
        if state.kind != crate::git::state::RepoStateKind::Rebase {
            return Err(e);
        }
    }

    Ok(state)
}

fn canonicalize_repo_path(repo_path: &str) -> Result<PathBuf, AppError> {
    let raw = PathBuf::from(repo_path);
    if !raw.exists() {
        return Err(AppError::new(
            ErrorKind::InvalidPath,
            format!("Путь '{repo_path}' не существует"),
            None,
        ));
    }
    raw.canonicalize().map_err(|e| {
        AppError::new(
            ErrorKind::InvalidPath,
            format!("Не удалось канонизировать путь: {e}"),
            None,
        )
    })
}

fn resolve_helper_exe() -> Result<PathBuf, AppError> {
    let current_exe = std::env::current_exe().map_err(|e| {
        AppError::new(
            ErrorKind::Io,
            format!("Не удалось определить путь к бинарнику: {e}"),
            None,
        )
    })?;

    // Check sibling directory or parent directory for rebase_helper(.exe)
    if let Some(dir) = current_exe.parent() {
        let exe_name = if cfg!(windows) { "rebase_helper.exe" } else { "rebase_helper" };
        let candidate = dir.join(exe_name);
        if candidate.exists() {
            return Ok(candidate);
        }

        if dir.ends_with("deps") {
            if let Some(parent) = dir.parent() {
                let candidate = parent.join(exe_name);
                if candidate.exists() {
                    return Ok(candidate);
                }
            }
        }
    }

    Ok(current_exe)
}
