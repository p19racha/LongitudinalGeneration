use std::process::{Child, Command};
use std::sync::Mutex;

static BACKEND_CHILD: Mutex<Option<Child>> = Mutex::new(None);

fn start_backend_if_needed() {
    // Check if backend is already alive on port 8000
    let is_alive = std::net::TcpStream::connect("127.0.0.1:8000").is_ok();
    if !is_alive {
        println!("[Tauri] Starting PULSE Python backend on 127.0.0.1:8000...");
        let child = Command::new("python3")
            .args(["-m", "uvicorn", "server.main:app", "--host", "127.0.0.1", "--port", "8000"])
            .spawn();

        if let Ok(c) = child {
            if let Ok(mut guard) = BACKEND_CHILD.lock() {
                *guard = Some(c);
            }
        }
    } else {
        println!("[Tauri] PULSE backend is already active on port 8000.");
    }
}

fn stop_backend() {
    if let Ok(mut guard) = BACKEND_CHILD.lock() {
        if let Some(mut child) = guard.take() {
            println!("[Tauri] Terminating PULSE Python backend process...");
            let _ = child.kill();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    start_backend_if_needed();

    tauri::Builder::default()
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
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                stop_backend();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
