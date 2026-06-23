use crate::auth_security::SecurityVault;
use secrecy::ExposeSecret;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaChatResponse {
    pub message: ChatMessage,
    #[serde(default)]
    pub thinking: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaResponse {
    pub response: String,
}

/// Invoked from React to run an audit.
/// Accepts both legacy `campaign_data` and structured `messages` to remain backward compatible.
/// Rust combines it with the encrypted master prompt and sends it to Ollama's chat API.
#[tauri::command]
pub async fn run_local_audit(
    campaign_data: Option<String>,
    messages: Option<Vec<ChatMessage>>,
    model_id: String,
    vault: tauri::State<'_, SecurityVault>,
) -> Result<String, String> {
    println!("[LLM Router] Received local LLM request for model: {}", model_id);

    // 1. Parse incoming content: either structured messages or legacy campaign data
    let mut final_messages = if let Some(msgs) = messages {
        msgs
    } else if let Some(data) = campaign_data {
        vec![ChatMessage {
            role: "user".to_string(),
            content: data,
        }]
    } else {
        return Err("No input content or messages provided".to_string());
    };

    // 2. Retrieve the master prompt from the Secure Vault (if available)
    let master_prompt = {
        let vault_lock = vault.master_prompt.lock().unwrap();
        if let Some(secret) = &*vault_lock {
            secret.expose_secret().clone() // Clone only locally for the request
        } else {
            String::new() // Default to empty if not loaded, allowing local queries to pass
        }
    };

    // 3. Inject the master prompt securely into the system instruction
    if !master_prompt.is_empty() {
        if let Some(sys_msg) = final_messages.iter_mut().find(|m| m.role == "system") {
            sys_msg.content = format!("{}\n\nAdditional System Guidelines:\n{}", sys_msg.content, master_prompt);
        } else {
            final_messages.insert(0, ChatMessage {
                role: "system".to_string(),
                content: master_prompt,
            });
        }
    }

    // 4. Construct payload for Ollama's chat API
    let req_body = OllamaChatRequest {
        model: model_id,
        messages: final_messages,
        stream: false,
    };

    println!("[LLM Router] Routing to Ollama chat API locally on port 11434...");
    
    // Attempt local request
    let client = reqwest::Client::new();
    match client.post("http://localhost:11434/api/chat")
        .json(&req_body)
        .send()
        .await 
    {
        Ok(res) => {
            if res.status().is_success() {
                let json: OllamaChatResponse = res.json().await.map_err(|e| e.to_string())?;
                println!("[LLM Router] Ollama completed successfully.");
                Ok(json.message.content)
            } else {
                Err(format!("Ollama API returned error: {}", res.status()))
            }
        },
        Err(e) => {
            println!("[LLM Router] Ollama unreachable: {}. Fallback to Cloud...", e);
            // This is where we trigger Cloud-Backup-Prompt fallback
            // For now, we return a specific error that the ExecutionRouter in TS can catch
            Err("ERR_OLLAMA_UNREACHABLE".to_string())
        }
    }
}
