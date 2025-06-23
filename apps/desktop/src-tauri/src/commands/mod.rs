use serde::{Deserialize, Serialize};

pub mod api;
pub mod native;

pub use api::*;
pub use native::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to AngstromSCD Medical Research Assistant.", name)
}