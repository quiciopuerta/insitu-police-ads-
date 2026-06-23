use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

#[derive(Default)]
pub struct OllamaProcess {
    pub child: Mutex<Option<CommandChild>>,
}

#[derive(Serialize, Deserialize)]
pub struct OllamaStatus {
    pub installed: bool,
    pub running: bool,
    pub models: Vec<String>,
}

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Deserialize)]
struct OllamaModel {
    name: String,
}

/// Checks if Ollama is running and what models are installed
#[tauri::command]
pub async fn check_ollama_status() -> Result<OllamaStatus, String> {
    let client = Client::new();
    
    // Check if running on localhost:11434
    match client.get("http://localhost:11434/api/tags").send().await {
        Ok(res) => {
            if res.status().is_success() {
                let tags: OllamaTagsResponse = res.json().await.map_err(|e| e.to_string())?;
                let models: Vec<String> = tags.models.into_iter().map(|m| m.name).collect();
                Ok(OllamaStatus {
                    installed: true,
                    running: true,
                    models,
                })
            } else {
                Err(format!("Ollama returned error: {}", res.status()))
            }
        },
        Err(_) => {
            // Not running. Since we bundle the sidecar, it is always considered "installed".
            Ok(OllamaStatus {
                installed: true,
                running: false,
                models: vec![],
            })
        }
    }
}

/// Starts the Ollama daemon in the background using the Tauri sidecar
#[tauri::command]
pub fn start_ollama_daemon(app: AppHandle, state: State<'_, OllamaProcess>) -> Result<bool, String> {
    println!("[Ollama Manager] Starting Ollama sidecar daemon...");
    
    // Ensure we don't start it twice
    let mut child_lock = state.child.lock().unwrap();
    if child_lock.is_some() {
        return Ok(true); // Already running from our perspective
    }
    
    match app.shell().sidecar("ollama") {
        Ok(cmd) => {
            match cmd.args(["serve"]).spawn() {
                Ok((_rx, child)) => {
                    *child_lock = Some(child);
                    println!("[Ollama Manager] Sidecar daemon started successfully.");
                    Ok(true)
                },
                Err(e) => {
                    Err(format!("Failed to spawn Ollama sidecar: {}", e))
                }
            }
        },
        Err(e) => {
            Err(format!("Failed to find Ollama sidecar binary: {}", e))
        }
    }
}

/// Downloads a specific model (e.g., "gemma4:e4b")
#[tauri::command]
pub async fn pull_model(model_name: String) -> Result<bool, String> {
    println!("[Ollama Manager] Pulling model: {}", model_name);
    let client = Client::new();
    
    let req_body = serde_json::json!({
        "name": model_name,
        "stream": false
    });
    
    match client.post("http://localhost:11434/api/pull")
        .json(&req_body)
        .send()
        .await
    {
        Ok(res) => {
            if res.status().is_success() {
                Ok(true)
            } else {
                Err(format!("Failed to pull model: {}", res.status()))
            }
        },
        Err(e) => Err(format!("Network error: {}", e))
    }
}

/// Stops the daemon on app exit
pub fn stop_daemon(state: &OllamaProcess) {
    let mut child_lock = state.child.lock().unwrap();
    if let Some(child) = child_lock.take() {
        println!("[Ollama Manager] Stopping Ollama sidecar daemon...");
        let _ = child.kill();
    }
}

#[derive(Serialize, Deserialize)]
struct OllamaRunningModel {
    name: String,
    size: u64,
}

#[derive(Deserialize)]
struct OllamaPsResponse {
    models: Vec<OllamaRunningModel>,
}

/// Lists currently loaded models in Ollama's memory (VRAM)
#[tauri::command]
pub async fn list_running_models() -> Result<Vec<String>, String> {
    let client = Client::new();
    match client.get("http://localhost:11434/api/ps").send().await {
        Ok(res) => {
            if res.status().is_success() {
                let ps_res: OllamaPsResponse = res.json().await.map_err(|e| e.to_string())?;
                let names = ps_res.models.into_iter().map(|m| m.name).collect();
                Ok(names)
            } else {
                Err(format!("Ollama ps returned error: {}", res.status()))
            }
        },
        Err(e) => Err(format!("Network error checking running models: {}", e))
    }
}

