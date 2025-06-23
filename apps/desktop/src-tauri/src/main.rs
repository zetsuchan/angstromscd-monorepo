#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod commands;
use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // Set up liquid glass effect for macOS
            #[cfg(target_os = "macos")]
            {
                use tauri::window::Color;
                window.set_background_color(Some(Color(0, 0, 0, 0))).ok();
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_api_data,
            search_literature,
            get_voe_alerts,
            send_chat_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}