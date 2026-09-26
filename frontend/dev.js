import { spawn } from "bun";
import path from "node:path";
import fs from "node:fs";

const frontendDir = import.meta.dir;
const backendDir = path.resolve(frontendDir, "../backend");

function getPythonExecutable() {
  const isWin = process.platform === "win32";
  const venvPythonWin = path.join(backendDir, "venv", "Scripts", "python.exe");
  const venvPythonUnix = path.join(backendDir, "venv", "bin", "python");

  if (isWin && fs.existsSync(venvPythonWin)) {
    return venvPythonWin;
  }
  if (!isWin && fs.existsSync(venvPythonUnix)) {
    return venvPythonUnix;
  }
  return isWin ? "python" : "python3";
}

async function isBackendRunning() {
  try {
    const res = await fetch("http://127.0.0.1:8000/", {
      signal: AbortSignal.timeout(1200),
    });
    return res.ok || res.status === 200;
  } catch {
    return false;
  }
}

async function waitForBackend(maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isBackendRunning()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

let backendProc = null;
let frontendProc = null;

function cleanup() {
  if (backendProc) {
    try {
      if (process.platform === "win32" && backendProc.pid) {
        Bun.spawnSync(["taskkill", "/pid", String(backendProc.pid), "/T", "/F"]);
      } else {
        backendProc.kill();
      }
    } catch {}
    backendProc = null;
  }
  if (frontendProc) {
    try {
      if (process.platform === "win32" && frontendProc.pid) {
        Bun.spawnSync(["taskkill", "/pid", String(frontendProc.pid), "/T", "/F"]);
      } else {
        frontendProc.kill();
      }
    } catch {}
    frontendProc = null;
  }
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

process.on("exit", () => {
  cleanup();
});

async function main() {
  const backendRunning = await isBackendRunning();
  if (backendRunning) {
    console.log("🎃 [FrightFate] Backend is already running at http://127.0.0.1:8000");
  } else {
    const pythonExe = getPythonExecutable();
    console.log(`🎃 [FrightFate] Starting backend server using ${pythonExe}...`);
    backendProc = spawn([pythonExe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"], {
      cwd: backendDir,
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
      stdout: "inherit",
      stderr: "inherit",
    });

    const isReady = await waitForBackend();
    if (isReady) {
      console.log("🎃 [FrightFate] Backend started successfully at http://127.0.0.1:8000");
    } else {
      console.log("⚠️  [FrightFate] Backend launch initiated (waiting for startup)...");
    }
  }

  console.log("⚡ [FrightFate] Starting frontend server with Next.js...");
  frontendProc = spawn(["bun", "run", "dev:only"], {
    cwd: frontendDir,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  await frontendProc.exited;
  cleanup();
}

main().catch((err) => {
  console.error("❌ Failed to start development servers:", err);
  cleanup();
  process.exit(1);
});
