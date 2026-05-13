# Landing Page Template (Next.js + Express)

A deployable landing page engine with integrated **Red Dot Payment** and a **No-Code Admin Hub** — fully hostable on Vercel.

---

## Architecture

| Layer | Tech | Hosting |
|---|---|---|
| Frontend | Next.js 15, Tailwind CSS, shadcn/ui | Vercel |
| Backend | Express.js, Drizzle ORM | Vercel (separate project) |
| Database | Neon (serverless PostgreSQL) | Neon |
| File Storage | Vercel Blob | Vercel |
| Auth | JWT (stored in localStorage) | — |
| Payment | Red Dot Payment (CIT / MIT) | — |

---

## Local Development

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech) database (free tier)

### 1. Clone and set up environment files

**Backend** — create `backend/.env`:
```env
DATABASE_URL=postgresql://...     # from Neon dashboard
JWT_SECRET=your-random-32-char-secret
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
CRON_SECRET=your-cron-secret
API_SECRET_KEY=your-api-secret
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=Admin1234!
FRONTEND_CORS_ORIGIN=http://localhost:3000
```

**Frontend** — create `reddot-frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
API_URL=http://localhost:4000
API_SECRET_KEY=your-api-secret        # must match backend
CRON_SECRET=your-cron-secret          # must match backend
RDP_MID=your_merchant_id_here
RDP_SECRET_KEY=your_secret_key_here
```

### 2. Set up the database
```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
```
This creates all tables and seeds the default admin user.

### 3. Start both servers (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
Runs on `http://localhost:4000`

**Terminal 2 — Frontend:**
```bash
cd reddot-frontend
npm install
npm run dev
```
Runs on `http://localhost:3000`

---

## Deploying to Vercel

### Step 1 — Deploy the backend

1. Go to [vercel.com](https://vercel.com) → New Project → Import `landing_page_template`
2. Set **Root Directory** to `backend`
3. Add all environment variables from `backend/.env.example`
4. Deploy — copy the assigned URL (e.g. `https://your-backend.vercel.app`)

### Step 2 — Deploy the frontend

1. New Project → Import the same repo
2. Set **Root Directory** to `reddot-frontend`
3. Add environment variables from `reddot-frontend/.env.local.example`
4. Set `NEXT_PUBLIC_API_URL` to your backend Vercel URL from Step 1
5. Deploy

### Step 3 — Update RDP webhook URL

In your Red Dot Payment merchant dashboard, set the S2S webhook URL to:
```
https://your-frontend.vercel.app/api/payment/notify
```

---

## New Project Checklist

When using this as a template for a new client:

| File | What to change |
|---|---|
| `backend/.env` | All secrets — `DATABASE_URL`, `JWT_SECRET`, `API_SECRET_KEY`, `CRON_SECRET`, `ADMIN_EMAIL/PASSWORD` |
| `reddot-frontend/.env.local` | `NEXT_PUBLIC_API_URL`, `API_SECRET_KEY`, `CRON_SECRET`, `RDP_MID`, `RDP_SECRET_KEY` |
| `reddot-frontend/src/lib/cms-store.ts` | `INITIAL_CONFIG` — default site content before admin first configures it |

---

## Admin Hub Features

Accessible at `/admin` after logging in at `/login`:

- **Navigation** — add/remove/reorder top nav links
- **Branding** — company name, logo upload (Vercel Blob)
- **Hero Section** — title, subtitle, badge, CTA buttons, background image
- **Feature Sections** — image + text blocks with configurable layout
- **Membership Tiers** — create pricing tiers (monthly / yearly / one-time), toggle visibility
- **Payments Ledger** — audit of all RDP transactions (CIT and MIT), auto-refreshes every 30s
- **Member Database** — manage registered users, trigger manual MIT billing

**Default credentials:**
- Email: `admin@admin.com`
- Password: `Admin1234!`

> Change these immediately after first login.

---

## Payment Integration (Red Dot Payment)

- **CIT** (Customer Initiated) — standard registration checkout, redirects to RDP gateway
- **MIT** (Merchant Initiated) — recurring billing using stored Payer ID, triggerable from Admin Hub
- **Webhook** — RDP posts S2S notifications to `/api/payment/notify` → forwarded to Express backend
- **Cron** — call `GET /api/cron/charge` with `Authorization: Bearer CRON_SECRET` to process due renewals

---

## API Endpoints (Backend)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — | Admin login, returns JWT |
| POST | `/auth/signup` | — | Create admin account |
| GET | `/auth/refresh` | JWT | Refresh token |
| GET | `/site-config` | — | Get site configuration |
| PUT | `/site-config` | JWT | Update site configuration |
| GET | `/members` | JWT | List all members |
| GET | `/members/taken-dates` | — | Get booked dates (for calendar) |
| GET | `/members/:id` | JWT | Get single member |
| POST | `/members` | — | Create member (registration) |
| PUT | `/members/:id` | JWT or API Secret | Update member |
| GET | `/transactions` | JWT | List transactions |
| POST | `/transactions` | API Secret | Record transaction |
| POST | `/assets` | JWT | Upload file to Vercel Blob |
| POST | `/webhook/rdp` | — | Receive RDP S2S webhook |
| GET | `/health` | — | Health check |
