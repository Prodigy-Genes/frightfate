# FrightFate Zero-Docker Production Deployment Guide

This guide details how to deploy **FrightFate** into production **without Docker**, using modern Git-connected cloud platforms or self-hosted bare-metal servers.

---

## Architecture Overview

- **Frontend**: Next.js (App Router) + TypeScript client, built with Bun. Hosted on Vercel/Node runtime.
- **Backend**: FastAPI (Python 3.12) running asynchronous Uvicorn workers.
- **Database**: PostgreSQL (Neon / Supabase / Railway) or persistent local SQLite.
- **Realtime**: WebSockets for live lobby synchronization, player presence, and game state.

---

## Option 1: PaaS Deployment (Recommended & Free / Low-Cost)

### Part A: Deploy Frontend to Vercel (or Cloudflare Pages)

1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your `fright-fate` repository.
4. Set the **Root Directory** to `frontend`.
5. Under **Build and Output Settings**:
   - Framework Preset: `Next.js`
   - Build Command: `bun run build`
   - Install Command: `bun install`
6. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://your-backend-service.onrender.com` (your deployed backend URL)
7. Click **Deploy**. Vercel will build and serve your Next.js app with automatic SSL.

---

### Part B: Deploy Backend to Render (or Railway)

#### Deploying on Render:
1. Sign in to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
5. Under **Environment Variables**, configure:
   - `OPENAI_API_KEY`: Your provider API key (Groq, OpenAI, DeepSeek, ...).
   - `OPENAI_BASE_URL`: `https://api.groq.com/openai/v1` (Groq) or the matching base URL of your provider.
   - `OPENAI_MODEL`: e.g. `openai/gpt-oss-120b` (Groq) or `gpt-4o-mini` (OpenAI).
   - `DATABASE_URL`: `sqlite:///./frightfate.db` (or a PostgreSQL connection string from Neon/Supabase).
   - `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app` (your Vercel URL).
   - `ENVIRONMENT`: `production`
6. Click **Create Web Service**. Render provides automatic health checks at `/health` and native HTTPS.

---

## Option 2: Self-Hosted Bare-Metal / VPS Deployment (Next.js + PM2 + Caddy)

If you are running your own Linux or Windows VPS without Docker:

### 1. Prerequisites
- Install **Bun**: `curl -fsSL https://bun.sh/install | bash`
- Install **Python 3.12**: `sudo apt install python3 python3-venv`
- Install **PM2**: `bun install -g pm2`

### 2. Setup Code & Dependencies
```bash
git clone https://github.com/Prodigy-Genes/frightfate.git /opt/frightfate
cd /opt/frightfate

# Setup Backend Virtualenv
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.example .env
# Edit .env with your GITHUB_TOKEN and settings
cd ..

# Build Frontend (Next.js)
cd frontend
bun install
bun run build
cd ..
```

### 3. Start Processes with PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

PM2 runs the backend with Uvicorn and the frontend with `next start` on port `5173`.

> **Important:** run the backend with **a single worker** (`--workers 1`). Lobby
> presence, the shared Fate Feed and WebSocket routing live in per-process
> memory, so multiple workers would split rooms across processes.

### 4. Reverse Proxy with Caddy (Automatic HTTPS)
Install Caddy and add to `/etc/caddy/Caddyfile`:
```caddy
yourdomain.com {
    # Backend API and WebSocket proxy
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }
    handle /ws/* {
        reverse_proxy 127.0.0.1:8000
    }
    handle /health {
        reverse_proxy 127.0.0.1:8000
    }

    # Everything else is served by the Next.js server
    reverse_proxy 127.0.0.1:5173
}
```
Reload Caddy: `sudo systemctl reload caddy`.

---

## Verification & Health Check

1. **Backend Health Check**:
   ```bash
   curl https://your-backend-url/health
   # Response: {"status":"ok","service":"FrightFate API","version":"1.0.0"}
   ```
2. **WebSocket Test**:
   Connect via browser or wscat to `wss://your-backend-url/ws/TEST01`.

---

## AI Engine Telemetry

Every AI-backed response carries an `engine` field (`"ai"` or `"fallback"`).
The frontend displays this honestly in the Fate Engine badge, so an exhausted
API key or provider outage degrades gracefully instead of failing silently.
If you see `"engine": "fallback"` in production, check the provider key/credits
in your backend environment.
