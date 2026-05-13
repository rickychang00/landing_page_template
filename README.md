# RedDot Master Template (Next.js + PocketBase)

A deployable landing page engine with integrated **Red Dot Payment** and a **No-Code Admin Hub**.

---

## Quick Start (Local Development)

This is the recommended setup for development — frontend runs via `npm run dev`, PocketBase runs in Docker.

**1. Clone and configure**
```bash
cp .env.example .env
```
Edit `.env`:
- Set a unique `COMPOSE_PROJECT_NAME` (e.g. `my_project`)
- Set unique `FRONTEND_PORT` / `BACKEND_PORT` if running multiple projects
- Add your `RDP_MID` and `RDP_SECRET_KEY`

**2. Create the frontend env file**

Create `reddot-frontend/.env.local` with:
```
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```
Replace `8090` with your `BACKEND_PORT` if you changed it.

**3. Start PocketBase (backend only)**
```bash
docker compose up pb_backend -d
```

**4. Create your PocketBase admin account**

Visit `http://localhost:8090/_/` and register your superadmin account.
All collections and API rules are created automatically via migrations on first launch.

**5. Start the frontend**
```bash
cd reddot-frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`
Admin Hub: `http://localhost:3000/admin`

---

## Full Docker Deployment (Production)

Runs both frontend and backend in Docker.

```bash
docker compose up -d --build
```

Frontend: `http://localhost:9002` (or your `FRONTEND_PORT`)
PocketBase Admin: `http://localhost:8090/_/`

---

## New Project Checklist

When cloning this template for a new client, change these files:

| File | What to change |
|------|----------------|
| `.env` | `COMPOSE_PROJECT_NAME` (unique per project), `FRONTEND_PORT`, `BACKEND_PORT`, `RDP_MID`, `RDP_SECRET_KEY` |
| `reddot-frontend/.env.local` | `NEXT_PUBLIC_POCKETBASE_URL` to match `BACKEND_PORT` |
| `reddot-frontend/src/lib/rdp-utils.ts` | `MID` and `SECRET_KEY` constants with the client's RDP credentials |
| `reddot-frontend/src/lib/cms-store.ts` | `INITIAL_CONFIG` — default site content before admin first configures it |

> **Port isolation**: If running multiple projects on the same server, each must have a unique `COMPOSE_PROJECT_NAME`, `FRONTEND_PORT`, and `BACKEND_PORT` in `.env`.

---

## Architecture

- **Frontend**: Next.js 15 on port `FRONTEND_PORT` (default 9002)
- **Backend**: PocketBase on port `BACKEND_PORT` (default 8090) — handles database, auth, and file storage
- **Isolation**: `COMPOSE_PROJECT_NAME` namespaces all Docker containers so multiple projects run independently

---

## Admin Hub Features

Accessible at `/admin` after logging in:

- **Navigation** — add/remove/reorder top nav links
- **Branding** — company name, logo upload
- **Hero Section** — title, subtitle, badge, CTA buttons, background image
- **Feature Sections** — image + text blocks with configurable layout
- **Membership Tiers** — create pricing tiers (monthly / yearly / one-time), toggle visibility, manage feature lists
- **Payments Ledger** — live audit of all RDP transactions (CIT and MIT)
- **Member Database** — manage registered users, trigger Manual MIT billing

---

## Payment Integration (Red Dot Payment)

- **CIT** (Customer Initiated) — standard registration checkout flow
- **MIT** (Merchant Initiated) — one-click recurring billing from the Admin Hub using stored Payer ID
- **Webhook** — automated payment status updates
