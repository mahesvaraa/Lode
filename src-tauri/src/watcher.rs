use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/api/types/repo_changed_event.ts")]
pub struct RepoChangedEvent {
    pub scopes: Vec<String>,
}

#[derive(Clone)]
pub struct RepoWatcherState {
    pub is_suppressed: Arc<AtomicBool>,
    pub current_repo: Arc<tokio::sync::RwLock<Option<PathBuf>>>,
}

pub struct RepoWatcher {
    state: RepoWatcherState,
    stop_tx: Arc<tokio::sync::Mutex<Option<mpsc::Sender<()>>>>,
    app_handle: AppHandle,
}

impl RepoWatcher {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            state: RepoWatcherState {
                is_suppressed: Arc::new(AtomicBool::new(false)),
                current_repo: Arc::new(tokio::sync::RwLock::new(None)),
            },
            stop_tx: Arc::new(tokio::sync::Mutex::new(None)),
            app_handle,
        }
    }

    pub fn suppress(&self) {
        self.state.is_suppressed.store(true, Ordering::SeqCst);
    }

    pub fn unsuppress(&self) {
        self.state.is_suppressed.store(false, Ordering::SeqCst);
    }

    pub async fn watch_repo(&self, repo_path: &Path) {
        // Stop any existing watcher
        self.stop().await;

        let canonical = repo_path.canonicalize().unwrap_or_else(|_| repo_path.to_path_buf());
        {
            let mut current = self.state.current_repo.write().await;
            *current = Some(canonical.clone());
        }

        let (stop_sender, mut stop_receiver) = mpsc::channel::<()>(1);
        {
            let mut stop_lock = self.stop_tx.lock().await;
            *stop_lock = Some(stop_sender);
        }

        let (event_sender, mut event_receiver) = mpsc::channel::<Vec<PathBuf>>(100);
        let suppressed = Arc::clone(&self.state.is_suppressed);
        let app = self.app_handle.clone();
        let repo_root = canonical.clone();
        let root_for_closure = repo_root.clone();

        // Background watcher thread with notify
        std::thread::spawn(move || {
            let event_tx = event_sender.clone();
            let mut watcher: RecommendedWatcher = match Watcher::new(
                move |res: Result<Event, notify::Error>| {
                    if suppressed.load(Ordering::SeqCst) {
                        return;
                    }
                    if let Ok(event) = res {
                        if should_process_event(&event, &root_for_closure) {
                            let _ = event_tx.blocking_send(event.paths);
                        }
                    }
                },
                notify::Config::default(),
            ) {
                Ok(w) => w,
                Err(e) => {
                    eprintln!("Failed to create watcher: {e}");
                    return;
                }
            };

            // Watch working tree recursively
            if let Err(e) = watcher.watch(&repo_root, RecursiveMode::Recursive) {
                eprintln!("Failed to watch repo root: {e}");
            }

            // Keep thread alive until stopped
            let _ = event_sender;
        });

        // Debounce task (200 ms) in Tokio runtime
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::select! {
                    _ = stop_receiver.recv() => {
                        break;
                    }
                    Some(first_paths) = event_receiver.recv() => {
                        // Drain pending events in the debounce window
                        let mut collected_paths = first_paths;
                        tokio::time::sleep(Duration::from_millis(200)).await;
                        while let Ok(paths) = event_receiver.try_recv() {
                            collected_paths.extend(paths);
                        }

                        // Determine affected scopes
                        let mut scopes = vec!["status".to_string(), "state".to_string()];
                        for p in &collected_paths {
                            let s = p.to_string_lossy();
                            if s.contains("HEAD") || s.contains("refs") || s.contains("packed-refs") {
                                if !scopes.contains(&"refs".to_string()) {
                                    scopes.push("refs".to_string());
                                }
                                if !scopes.contains(&"history".to_string()) {
                                    scopes.push("history".to_string());
                                }
                            }
                        }

                        // Emit event to frontend
                        let event = RepoChangedEvent { scopes };
                        let _ = app.emit("repo:changed", event);
                    }
                }
            }
        });
    }

    pub async fn stop(&self) {
        let mut stop_lock = self.stop_tx.lock().await;
        if let Some(tx) = stop_lock.take() {
            let _ = tx.send(()).await;
        }
        let mut current = self.state.current_repo.write().await;
        *current = None;
    }
}

fn should_process_event(event: &Event, repo_root: &Path) -> bool {
    for path in &event.paths {
        if let Ok(rel) = path.strip_prefix(repo_root) {
            let rel_str = rel.to_string_lossy();

            // Ignore noisy and generated directories
            if rel_str.starts_with(".git/objects")
                || rel_str.starts_with(".git\\objects")
                || rel_str.contains("node_modules")
                || rel_str.contains("target")
                || rel_str.contains(".npm-cache")
                || rel_str.contains(".vite")
            {
                return false;
            }

            // Always accept git metadata changes
            if rel_str.starts_with(".git") {
                return true;
            }
        }
    }
    true
}
