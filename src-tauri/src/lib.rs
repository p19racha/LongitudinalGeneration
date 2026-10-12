use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

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

    // 5. Hardcoded fallback for user's repository path on Linux
    let default_repo = PathBuf::from("/home/racha/LongitudinalGeneration");
    if default_repo.join("server/main.py").exists() {
        return Some(default_repo);
    }

    None
}

fn find_python_binary(project_root: Option<&Path>) -> Option<String> {
    // 1. Check PULSE_PYTHON env var
    if let Ok(py) = std::env::var("PULSE_PYTHON") {
        if Path::new(&py).exists() {
            return Some(py);
        }
    }

    // 2. Check virtual environment in project root
    if let Some(root) = project_root {
        let venv_py_unix = root.join(".venv/bin/python");
        if venv_py_unix.exists() {
            return Some(venv_py_unix.to_string_lossy().to_string());
        }
        let venv_py_win = root.join(".venv/Scripts/python.exe");
        if venv_py_win.exists() {
            return Some(venv_py_win.to_string_lossy().to_string());
        }
    }

    // 3. Hardcoded user environment fallback on Linux
    let default_venv = PathBuf::from("/home/racha/LongitudinalGeneration/.venv/bin/python");
    if default_venv.exists() {
        return Some(default_venv.to_string_lossy().to_string());
    }

    // 4. PATH fallback: ONLY if a valid project root exists!
    if project_root.is_some() {
        if cfg!(target_os = "windows") {
            Some("python".to_string())
        } else {
            Some("python3".to_string())
        }
    } else {
        None
    }
}

fn start_backend_if_needed() {
    if is_port_open(8000) {
        println!("[Tauri] PULSE backend is already active on port 8000.");
        return;
    }

    let root_opt = find_project_root();

    // On Windows host, if native project root was not found, check if WSL has the project backend
    #[cfg(target_os = "windows")]
    if root_opt.is_none() {
        println!("[Tauri] Checking WSL for PULSE backend on Windows...");
        let mut wsl_cmd = Command::new("wsl.exe");
        wsl_cmd.args([
            "--",
            "bash",
            "-c",
            "if [ -f /home/racha/LongitudinalGeneration/server/main.py ]; then cd /home/racha/LongitudinalGeneration && .venv/bin/python -m uvicorn server.main:app --host 0.0.0.0 --port 8000; fi",
        ]);
        wsl_cmd.creation_flags(CREATE_NO_WINDOW);

        match wsl_cmd.spawn() {
            Ok(child) => {
                if let Ok(mut guard) = BACKEND_CHILD.lock() {
                    *guard = Some(child);
                }
                println!("[Tauri] WSL backend process spawned. Waiting for port 8000...");
                for attempt in 1..=10 {
                    thread::sleep(Duration::from_millis(250));
                    if is_port_open(8000) {
                        println!("[Tauri] PULSE WSL backend is ready on port 8000 (after ~{} ms).", attempt * 250);
                        return;
                    }
                }
            }
            Err(e) => {
                println!("[Tauri] WSL spawn skipped: {}", e);
            }
        }
        return;
    }

    let python_bin = match find_python_binary(root_opt.as_deref()) {
        Some(bin) => bin,
        None => {
            println!("[Tauri] No local Python backend project found. Running as client-only frontend.");
            return;
        }
    };

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

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    // Cleanse environment variables exported by AppImage runtime:
    cmd.env_remove("PYTHONHOME");
    cmd.env_remove("PYTHONEXECUTABLE");
    cmd.env_remove("PYTHONNOUSERSITE");

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

            for attempt in 1..=40 {
                thread::sleep(Duration::from_millis(250));
                if is_port_open(8000) {
                    println!("[Tauri] PULSE backend is ready and listening on port 8000 (after ~{} ms).", attempt * 250);
                    return;
                }
            }
            eprintln!("[Tauri] Warning: PULSE backend did not respond on port 8000 within 10 seconds.");
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
    // CRITICAL: Launch backend checks in a background thread so the GUI thread is NEVER blocked.
    // This allows the desktop window on Windows/macOS/Linux to create and display instantly.
    thread::spawn(|| {
        start_backend_if_needed();
    });

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
