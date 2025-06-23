use tauri::Manager;

#[tauri::command]
pub fn toggle_fullscreen(window: tauri::Window) -> Result<(), String> {
    match window.is_fullscreen() {
        Ok(is_fullscreen) => {
            window.set_fullscreen(!is_fullscreen)
                .map_err(|e| e.to_string())
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn maximize_window(window: tauri::Window) -> Result<(), String> {
    match window.is_maximized() {
        Ok(is_maximized) => {
            if is_maximized {
                window.unmaximize().map_err(|e| e.to_string())
            } else {
                window.maximize().map_err(|e| e.to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}