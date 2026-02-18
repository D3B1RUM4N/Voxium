// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Start the backend server in a background thread
    std::thread::spawn(|| {
        backend::run_server();
    });

    // Give the backend a moment to bind the port
    std::thread::sleep(std::time::Duration::from_millis(500));

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
