use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

static BACKEND_CHILD: Mutex<Option<Child>> = Mutex::new(None);

fn is_port_open(port: u16) -> bool {
    TcpStream::connect(format!("127.0.0.1:{}", port)).is_ok()
}

fn find_project_root() -> Option<PathBuf> {
    // 1. Check PULSE_PROJECT_ROOT env var
    if let Ok(root_str) = std::env::var("PULSE_PROJECT_ROOT") {
        let p = PathBuf::from(root_str);
        if p.join("server/main.py").exists() {
            return Some(p);
        }
    }

    // 2. Search upwards from current working directory
    if let Ok(cwd) = std::env::current_dir() {
        let mut curr = Some(cwd.as_path());
        while let Some(dir) = curr {
            if dir.join("server/main.py").exists() {
                return Some(dir.to_path_buf());
            }
            curr = dir.parent();
        }
    }

    // 3. Search upwards from original working directory (OWD set by AppImage)
    if let Ok(owd) = std::env::var("OWD") {
        let mut curr = Some(Path::new(&owd));
        while let Some(dir) = curr {
            if dir.join("server/main.py").exists() {
                return Some(dir.to_path_buf());
            }
            curr = dir.parent();
        }
    }

    // 4. Search upwards from executable directory
    if let Ok(exe_path) = std::env::current_exe() {
        let mut curr = exe_path.parent();
        while let Some(dir) = curr {
            if dir.join("server/main.py").exists() {
                return Some(dir.to_path_buf());
            }
            curr = dir.parent();
        }
    }

    // 5. Hardcoded fallback for user's repository path
    let default_repo = PathBuf::from("/home/racha/LongitudinalGeneration");
    if default_repo.join("server/main.py").exists() {
        return Some(default_repo);
    }

    None
}

fn find_python_binary(project_root: Option<&Path>) -> String {
    // 1. Check PULSE_PYTHON env var
    if let Ok(py) = std::env::var("PULSE_PYTHON") {
        if Path::new(&py).exists() {
            return py;
        }
    }

    // 2. Check virtual environment in project root
    if let Some(root) = project_root {
        let venv_py_unix = root.join(".venv/bin/python");
        if venv_py_unix.exists() {
            return venv_py_unix.to_string_lossy().to_string();
        }
        let venv_py_win = root.join(".venv/Scripts/python.exe");
        if venv_py_win.exists() {
            return venv_py_win.to_string_lossy().to_string();
        }
    }

    // 3. Hardcoded user environment fallback
    let default_venv = PathBuf::from("/home/racha/LongitudinalGeneration/.venv/bin/python");
    if default_venv.exists() {
        return default_venv.to_string_lossy().to_string();
    }

    // 4. PATH fallback
    if cfg!(target_os = "windows") {
        "python".to_string()
    } else {
        "python3".to_string()
    }
}

fn start_backend_if_needed() {
    if is_port_open(8000) {
        println!("[Tauri] PULSE backend is already active on port 8000.");
        return;
    }

    let root_opt = find_project_root();
    let python_bin = find_python_binary(root_opt.as_deref());

    println!("[Tauri] Spawning PULSE Python backend using interpreter: {}", python_bin);
    if let Some(ref r) = root_opt {
        println!("[Tauri] Project root detected at: {}", r.display());
    }

    let mut cmd = Command::new(&python_bin);
    cmd.args([
        "-m",
        "uvicorn",
        "server.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]);

    // CRITICAL: AppImages export PYTHONHOME, PYTHONPATH, and LD_LIBRARY_PATH which corrupt
    // host Python virtual environments (causing ModuleNotFoundError: No module named 'encodings').
    // We must cleanse these environment variables before invoking the host Python!
    cmd.env_remove("PYTHONHOME");
    cmd.env_remove("PYTHONEXECUTABLE");
    cmd.env_remove("PYTHONNOUSERSITE");

    // Cleanse LD_LIBRARY_PATH if running inside AppImage
    if std::env::var("APPDIR").is_ok() {
        if let Ok(orig_ld) = std::env::var("LD_LIBRARY_PATH_ORIG") {
            cmd.env("LD_LIBRARY_PATH", orig_ld);
        } else if let Ok(orig_ld2) = std::env::var("ORIG_LD_LIBRARY_PATH") {
            cmd.env("LD_LIBRARY_PATH", orig_ld2);
        } else {
            cmd.env_remove("LD_LIBRARY_PATH");
        }
    }

    if let Some(ref root) = root_opt {
        cmd.current_dir(root);
        cmd.env("PYTHONPATH", root);
    }

    match cmd.spawn() {
        Ok(child) => {
            if let Ok(mut guard) = BACKEND_CHILD.lock() {
                *guard = Some(child);
            }
            println!("[Tauri] Backend process spawned. Waiting for server readiness on port 8000...");

            // Wait up to 15 seconds for backend to bind and respond
            for attempt in 1..=60 {
                thread::sleep(Duration::from_millis(250));
                if is_port_open(8000) {
                    println!("[Tauri] PULSE backend is ready and listening on port 8000 (after ~{} ms).", attempt * 250);
                    return;
                }
            }
            eprintln!("[Tauri] Warning: PULSE backend did not respond on port 8000 within 15 seconds.");
        }
        Err(err) => {
            eprintln!("[Tauri] Failed to spawn PULSE Python backend: {}", err);
        }
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
