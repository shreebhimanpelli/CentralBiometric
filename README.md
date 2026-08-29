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
| **Frontend** | 3000 | Next.js SSR dashboard |
| **Sync Engine** | — | Background worker (no HTTP) |
| **MySQL** | 3306 | Central application database |

## Prerequisites

- **Node.js** ≥ 18
- **Docker & Docker Compose** (for MySQL)
- **npm** ≥ 9

## Quick Start

### 1. Start MySQL
```bash
docker-compose up -d
```

### 2. Setup Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your settings
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

### 3. Setup Sync Engine
```bash
cd sync-engine
cp .env.example .env
# Edit .env with your eSSL SQL Server details
npm install
npm run dev
```

### 4. Setup Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### 5. Access the App
Open [http://localhost:3000](http://localhost:3000)

#### Demo Credentials
| Role | User ID | Password |
|------|---------|----------|
| System Admin | `ADMIN001` | `admin123` |
| HOD (CS) | `EMP1001` | `hod123` |
| Event Coordinator | `EMP1003` | `coord123` |
| Staff | `EMP1002` | `staff123` |
| Student | `STU2001` | `student123` |

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
ESSL_DB_SERVER=192.168.1.100
ESSL_DB_PORT=1433
ESSL_DB_USER=essl_read_user
ESSL_DB_PASSWORD=secure_password
ESSL_DB_NAME=eTimeTrackLite1
ESSL_TABLE_NAME=DeviceLogs
```

## Tech Stack

- **Backend**: Express.js + Prisma ORM + MySQL
- **Frontend**: Next.js 15 (App Router)
- **Sync Engine**: Node.js + mssql driver
- **Auth**: JWT with refresh tokens (SSO/OAuth placeholder)
- **Database**: MySQL 8.0
