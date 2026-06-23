use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use zeroize::Zeroize;

#[derive(Default)]
pub struct SecurityVault {
    // SecretString automatically zeroes memory on drop and prevents accidental logging
    pub master_prompt: Mutex<Option<SecretString>>,
}

#[derive(Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    pub master_prompt: Option<String>,
}

/// Called via Tauri IPC from the React frontend upon login
#[tauri::command]
#[allow(unused_variables)]
pub async fn verify_license_and_inject(
    jwt_token: String,
    vault: tauri::State<'_, SecurityVault>,
) -> Result<bool, String> {
    println!("[Security] Verifying license with cloud...");
    
    #[cfg(debug_assertions)]
    let auth_data = AuthResponse {
        success: true,
        master_prompt: Some("You are INsitu AI, a Senior Media Planner and Competitive Intelligence Strategist. You are an expert in Technical SEO, Google Ads (Search/Performance Max) and market analysis.".to_string()),
    };

    #[cfg(not(debug_assertions))]
    let auth_data = {
        let client = reqwest::Client::new();
        let res = client.post("https://api.insitu.company/v1/verify-license")
            .header("Authorization", format!("Bearer {}", jwt_token))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        
        if res.status().is_success() {
            res.json::<AuthResponse>().await.map_err(|e| e.to_string())?
        } else {
            AuthResponse {
                success: false,
                master_prompt: None,
            }
        }
    };

    if auth_data.success {
        if let Some(mut prompt) = auth_data.master_prompt {
            let secret = SecretString::from(prompt.clone());
            
            // Zeroize the temporary String buffer immediately
            prompt.zeroize();
            
            // Inject into the secure vault
            let mut vault_lock = vault.master_prompt.lock().unwrap();
            *vault_lock = Some(secret);
            
            println!("[Security] License verified. Master prompt securely injected into RAM.");
            Ok(true)
        } else {
            Err("No master prompt received from server".to_string())
        }
    } else {
        Err("License verification failed".to_string())
    }
}
