use std::path::PathBuf;
use tauri::State;

use crate::error::{AppError, ErrorKind};
use crate::git::parse::{parse_commit_files, parse_git_log, parse_numstat, Commit, CommitDetails};
use crate::git::GitRunner;

const LOG_FORMAT: &str =
    "--format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%ce%x1f%ct%x1f%D%x1f%s%x1f%b";

#[tauri::command]
pub async fn get_commits(
    repo_path: String,
    skip: usize,
    limit: usize,
    branch: Option<String>,
    search: Option<String>,
    runner: State<'_, GitRunner>,
) -> Result<Vec<Commit>, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;
    let branch_ref = branch
        .as_deref()
        .map(str::trim)
        .filter(|b| !b.is_empty() && *b != "ALL");

    let search_query = search.as_deref().map(str::trim).filter(|q| !q.is_empty());

    if let Some(query) = search_query {
        let mut results = Vec::new();
        let mut seen_hashes = std::collections::HashSet::new();

        // 1. If query is a hex string (>= 4 chars), try resolving directly as commit hash
        let is_hex = query.len() >= 4 && query.chars().all(|c| c.is_ascii_hexdigit());
        if is_hex {
            let rev_arg = format!("{query}^{{commit}}");
            if let Ok(rev_out) = runner
                .run_read(Some(&canonical), &["rev-parse", "--verify", "--quiet", &rev_arg])
                .await
            {
                let sha = String::from_utf8_lossy(&rev_out.stdout).trim().to_string();
                if !sha.is_empty() {
                    let hash_log_args = ["log", "-z", "-1", LOG_FORMAT, &sha];
                    if let Ok(hash_out) = runner.run_read(Some(&canonical), &hash_log_args).await {
                        let parsed = parse_git_log(&hash_out.stdout);
                        for c in parsed {
                            if seen_hashes.insert(c.hash.clone()) {
                                results.push(c);
                            }
                        }
                    }
                }
            }
        }

        // 2. Concurrently run message search, author search, and committer search
        let limit_str = limit.to_string();
        let grep_arg = format!("--grep={query}");
        let author_arg = format!("--author={query}");
        let committer_arg = format!("--committer={query}");

        let mut base_args = vec!["log", "-z", "--date-order", LOG_FORMAT, "-n", &limit_str, "-i"];
        if let Some(b) = branch_ref {
            base_args.push(b);
        } else {
            base_args.push("--all");
        }

        let mut msg_args = base_args.clone();
        msg_args.push(&grep_arg);

        let mut auth_args = base_args.clone();
        auth_args.push(&author_arg);

        let mut com_args = base_args.clone();
        com_args.push(&committer_arg);

        let (msg_res, auth_res, com_res) = tokio::join!(
            runner.run_read(Some(&canonical), &msg_args),
            runner.run_read(Some(&canonical), &auth_args),
            runner.run_read(Some(&canonical), &com_args),
        );

        let mut other_commits = Vec::new();
        if let Ok(out) = msg_res {
            other_commits.extend(parse_git_log(&out.stdout));
        }
        if let Ok(out) = auth_res {
            other_commits.extend(parse_git_log(&out.stdout));
        }
        if let Ok(out) = com_res {
            other_commits.extend(parse_git_log(&out.stdout));
        }

        // Sort candidates by author_date descending
        other_commits.sort_by(|a, b| b.author_date.cmp(&a.author_date));

        for c in other_commits {
            if seen_hashes.insert(c.hash.clone()) {
                results.push(c);
            }
        }

        results.truncate(limit);
        return Ok(results);
    }

    let limit_str = limit.to_string();
    let skip_str = skip.to_string();

    let mut args: Vec<&str> = vec![
        "log",
        "-z",
        "--date-order",
        LOG_FORMAT,
        "-n",
        &limit_str,
        "--skip",
        &skip_str,
    ];

    if let Some(b) = branch_ref {
        args.push(b);
    } else {
        args.push("--all");
    }

    let output = runner.run_read(Some(&canonical), &args).await?;
    Ok(parse_git_log(&output.stdout))
}

#[tauri::command]
pub async fn get_commit_details(
    repo_path: String,
    hash: String,
    runner: State<'_, GitRunner>,
) -> Result<CommitDetails, AppError> {
    let canonical = canonicalize_repo_path(&repo_path)?;

    // 1. Fetch single commit header
    let log_args = ["log", "-z", "-1", LOG_FORMAT, &hash];
    let log_out = runner.run_read(Some(&canonical), &log_args).await?;
    let commits = parse_git_log(&log_out.stdout);
    let commit = commits.into_iter().next().ok_or_else(|| {
        AppError::new(
            ErrorKind::Unknown,
            format!("Коммит {hash} не найден"),
            None,
        )
    })?;

    // 2. Fetch changed files and per-file numstat concurrently
    let files_args = [
        "diff-tree",
        "-r",
        "--name-status",
        "-z",
        "--no-commit-id",
        "--root",
        "-m",
        "--first-parent",
        &hash,
    ];
    let numstat_args = [
        "show",
        "--numstat",
        "--format=",
        "-m",
        "--first-parent",
        "-z",
        &hash,
    ];

    let (files_res, numstat_res) = tokio::join!(
        runner.run_read(Some(&canonical), &files_args),
        runner.run_read(Some(&canonical), &numstat_args),
    );

    let files_out = files_res?;
    let mut files = parse_commit_files(&files_out.stdout);

    if let Ok(num_out) = numstat_res {
        let stats_map = parse_numstat(&num_out.stdout);
        for f in &mut files {
            if let Some((add, del)) = stats_map.get(&f.path) {
                f.additions = *add;
                f.deletions = *del;
            }
        }
    }

    let total_additions = files.iter().filter_map(|f| f.additions).sum();
    let total_deletions = files.iter().filter_map(|f| f.deletions).sum();

    Ok(CommitDetails {
        commit,
        files,
        total_additions,
        total_deletions,
    })
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
