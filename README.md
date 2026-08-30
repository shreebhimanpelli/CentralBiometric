# FLAME Biometric — Centralized University Biometric Attendance System

A full-stack biometric attendance tracking system that integrates with eSSL biometric devices, providing role-based dashboards for HODs, Event Coordinators, and Administrators.

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  eSSL MS SQL Server │     │   Sync Engine    │     │  MySQL (Central DB) │
│  (Raw Punch Logs)   │────▶│  (Delta Poller)  │────▶│  (Prisma ORM)       │
└─────────────────────┘     └──────────────────┘     └────────┬────────────┘
                                                              │
                                                              ▼
                            ┌──────────────────┐     ┌─────────────────────┐
                            │  Next.js Frontend│◀───▶│  Express.js API     │
                            │  (Role Dashboards)│     │  (REST + JWT Auth)  │
                            └──────────────────┘     └─────────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Backend API** | 4000 | Express.js REST API with JWT auth |
| **Frontend** | 3000 | Next.js dashboard (proxies `/api` to backend in dev) |
| **Sync Engine** | — | Background worker (no HTTP) |
| **MySQL** | 3306 | Central application database |

## Prerequisites

Install on **macOS** or **Windows**:

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | ≥ 18 | Includes npm |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Required for MySQL |

**macOS:** Install via Homebrew (`brew install node`) or the Node.js installer. Start Docker Desktop from Applications before running `docker compose`.

**Windows:** Install Node.js LTS and Docker Desktop. Enable WSL 2 if Docker prompts you. Run terminal commands in **PowerShell**, **Command Prompt**, or **Windows Terminal**.

Verify installations:

```bash
node -v
npm -v
docker --version
docker compose version
```

## Quick Start

Use **three separate terminal windows** — one each for MySQL (once), backend, and frontend.

### 1. Start MySQL

From the project root (`CentralBiometric`):

**macOS / Linux / Windows (PowerShell):**
```bash
docker compose up -d
```

> Older Docker installs may use `docker-compose up -d` instead.

Wait ~10 seconds for MySQL to initialize, then confirm the container is running:

```bash
docker compose ps
```

### 2. Setup Backend

**macOS / Linux:**
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

**Windows (PowerShell):**
```powershell
cd backend
copy .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

You should see: `FLAME Biometric API running on http://localhost:4000`

Leave this terminal open.

### 3. Setup Frontend

Open a **new** terminal:

**macOS / Linux:**
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

**Windows (PowerShell):**
```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

You should see: `Local: http://localhost:3000`

Leave this terminal open.

### 4. Setup Sync Engine (optional)

Only needed when connecting to a live eSSL SQL Server. For local development, skip this step — the sync engine runs in mock mode by default.

**macOS / Linux:**
```bash
cd sync-engine
cp .env.example .env
npm install
npm run dev
```

**Windows (PowerShell):**
```powershell
cd sync-engine
copy .env.example .env
npm install
npm run dev
```

Set `MOCK_MODE=false` in `sync-engine/.env` and configure your eSSL credentials when ready.

### 5. Access the App

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Demo Credentials

| Role | User ID | Password |
|------|---------|----------|
| System Admin | `ADMIN001` | `admin123` |
| HOD (CS) | `EMP1001` | `hod123` |
| Event Coordinator | `EMP1003` | `coord123` |
| Staff | `EMP1002` | `staff123` |
| Student | `STU2001` | `student123` |

## Environment Files

| File | Purpose |
|------|---------|
| `backend/.env` | Database URL, JWT secrets, port |
| `frontend/.env.local` | API URL (leave empty for local dev — requests proxy through Next.js) |
| `sync-engine/.env` | eSSL connection + `MOCK_MODE=true` for local dev |

Default database connection (matches `docker-compose.yml`):

```env
DATABASE_URL="mysql://flame_user:flame_password@localhost:3306/flame_biometric"
```

## Access Control Matrix

| Role | Staff Punches | Student Event Punches | Event Management |
|------|--------------|----------------------|------------------|
| HOD | Full (Department) | Read-only (Dept events) | View-only |
| Event Coordinator | No access | Full (Assigned events) | Create & Map |
| System Admin | Full System | Full System | Full Admin |
| Staff / Student | Self-view | Self-view | None |

## eSSL Integration

The Sync Engine connects to your eSSL MS SQL Server and polls the `DeviceLogs` table for new punch records every 60 seconds (configurable). Configure the connection in `sync-engine/.env`:

```env
MOCK_MODE=false
ESSL_DB_SERVER=192.168.1.100
ESSL_DB_PORT=1433
ESSL_DB_USER=essl_read_user
ESSL_DB_PASSWORD=secure_password
ESSL_DB_NAME=eTimeTrackLite1
ESSL_TABLE_NAME=DeviceLogs
POLL_INTERVAL_SECONDS=60
```

## Troubleshooting

### Login shows "Failed to fetch" or "Cannot reach the API"

Both servers must be running at the same time:
- Backend on port **4000** (`cd backend && npm run dev`)
- Frontend on port **3000** (`cd frontend && npm run dev`)

Ensure `frontend/.env.local` has `NEXT_PUBLIC_API_URL=` (empty). The frontend proxies API calls to the backend automatically.

### `docker compose` fails or MySQL won't connect

- **macOS:** Open Docker Desktop and wait until it shows "Running".
- **Windows:** Open Docker Desktop. If it asks for WSL 2, follow the setup wizard and restart.
- Check port 3306 isn't already in use by another MySQL instance.

### Prisma / database errors on first run

```bash
cd backend
npx prisma db push
npm run db:seed
```

### Frontend 500 errors or "Cannot find module" in `.next`

Stop the dev server, clear the cache, and restart:

**macOS / Linux:**
```bash
cd frontend
rm -rf .next
npm run dev
```

**Windows (PowerShell):**
```powershell
cd frontend
Remove-Item -Recurse -Force .next
npm run dev
```

Do not run `npm run build` while `npm run dev` is active — this can corrupt the dev cache.

### Port already in use

**macOS / Linux** — find and stop the process:
```bash
lsof -i :3000
lsof -i :4000
kill <PID>
```

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

## Tech Stack

- **Backend**: Express.js + Prisma ORM + MySQL
- **Frontend**: Next.js 15 (App Router), FLAME University brand colors
- **Sync Engine**: Node.js + mssql driver
- **Auth**: JWT with refresh tokens
- **Database**: MySQL 8.0 (Docker)
