mod auth_security;
mod llm_router;
mod ollama_manager;
mod web_scraper;

use auth_security::SecurityVault;
use ollama_manager::OllamaProcess;
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<bool, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(_update)) => Ok(true),
        Ok(None) => Ok(false),
        Err(e) => Err(format!("Update check failed: {}", e)),
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(mut update)) => {
            match update.download_and_install(|_, _| {}, || {}).await {
                Ok(_) => {
                    app.restart();
                    // app.restart() terminates the process, but we still need to return
                    Ok(())
                }
                Err(e) => Err(format!("Update installation failed: {}", e)),
            }
        }
        Ok(None) => Err("No update available".to_string()),
        Err(e) => Err(format!("Update check failed: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::default().build())
    .manage(SecurityVault::default())
    .manage(OllamaProcess::default())
    .invoke_handler(tauri::generate_handler![
        auth_security::verify_license_and_inject,
        llm_router::run_local_audit,
        ollama_manager::check_ollama_status,
        ollama_manager::start_ollama_daemon,
        ollama_manager::pull_model,
        ollama_manager::list_running_models,
        web_scraper::scrape_website,
        web_scraper::search_duckduckgo,
        check_for_updates,
        install_update
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .on_window_event(|app, event| {
      // Clean up daemon on window close if it's the last window
      if let tauri::WindowEvent::Destroyed = event {
          let state = app.state::<OllamaProcess>();
          ollama_manager::stop_daemon(&state);
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
