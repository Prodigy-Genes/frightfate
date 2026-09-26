module.exports = {
  apps: [
    {
      name: "frightfate-backend",
      cwd: "./backend",
      script: process.platform === "win32" ? ".\\venv\\Scripts\\python.exe" : "./venv/bin/python",
      args: "-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1",
      env: {
        NODE_ENV: "production",
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8"
      }
    },
    {
      name: "frightfate-frontend",
      cwd: "./frontend",
      script: "bun",
      args: "run start",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
