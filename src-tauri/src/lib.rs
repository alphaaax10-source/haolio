//! Haolio — Offline Infinite Canvas & Mind Mapping.
//!
//! The desktop shell is intentionally tiny: the entire application logic lives
//! in the web frontend. These commands provide local, sandbox-free file I/O
//! for the native Save/Open dialogs so projects never leave the user's PC.

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            write_text_file,
            write_binary_file,
            read_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Haolio");
}
