use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

#[derive(Default, Clone)]
pub struct RepoQueue {
    locks: Arc<RwLock<HashMap<PathBuf, Arc<Mutex<()>>>>>,
}

impl RepoQueue {
    pub fn new() -> Self {
        Self {
            locks: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn get_lock(&self, repo_path: &Path) -> Arc<Mutex<()>> {
        let canonical = repo_path.canonicalize().unwrap_or_else(|_| repo_path.to_path_buf());
        
        {
            let reader = self.locks.read().await;
            if let Some(lock) = reader.get(&canonical) {
                return Arc::clone(lock);
            }
        }

        let mut writer = self.locks.write().await;
        writer
            .entry(canonical)
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }
}
