use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;

#[derive(Debug, Clone)]
pub struct RepoWatcherState {
    pub is_suppressed: Arc<AtomicBool>,
    pub current_path: Option<PathBuf>,
}

pub struct RepoWatcher {
    state: RepoWatcherState,
    _stop_tx: Option<mpsc::Sender<()>>,
}

impl Default for RepoWatcher {
    fn default() -> Self {
        Self::new()
    }
}

impl RepoWatcher {
    pub fn new() -> Self {
        Self {
            state: RepoWatcherState {
                is_suppressed: Arc::new(AtomicBool::new(false)),
                current_path: None,
            },
            _stop_tx: None,
        }
    }

    pub fn suppress(&self) {
        self.state.is_suppressed.store(true, Ordering::SeqCst);
    }

    pub fn unsuppress(&self) {
        self.state.is_suppressed.store(false, Ordering::SeqCst);
    }

    pub fn set_current_repo(&mut self, path: Option<&Path>) {
        self.state.current_path = path.map(|p| p.to_path_buf());
    }
}
