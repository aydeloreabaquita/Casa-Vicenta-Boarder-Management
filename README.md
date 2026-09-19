# Casa Vicenta — Boarder Management System

A full-stack property/boarder management application built with React, Vite, Cloudflare Workers, D1, and R2.

This repository is prepared for two use cases:

1. **Portfolio demo** — a safe, static, clickable version that can be hosted on GitHub Pages with sample data only.
2. **Full-stack deployment** — the real Cloudflare Worker + D1 + R2 application for authenticated admin and boarder workflows.

> The GitHub Pages demo never connects to the production API, database, receipt bucket, or real user accounts.

## What potential clients can explore

The demo includes a public room-availability site plus one-click access to both sides of the portal:

- **Admin Demo** — dashboard KPIs, rooms, boarders, billing history, receipt review, electricity billing, applicants, complaints, users, and settings.
- **Boarder Demo** — current balance, due dates, payment receipt workflow, bill statements, contract/rules, complaints, payment history, and payment promises.
- **Public Website** — vacant rooms, application flow, and applicant contact/reschedule flow.

All demo writes are simulated. Refreshing the page restores the sample data.

## Tech stack

- React 19
- Vite 8
- Cloudflare Workers
- Cloudflare D1 (SQLite-compatible relational database)
- Cloudflare R2 (private payment-receipt storage)
- Wrangler
- Lucide React
- GitHub Actions + GitHub Pages for the portfolio demo

## Highlights

- Email or phone + password authentication
- HttpOnly session cookies
- PBKDF2 password hashing
- Forced password change for temporary credentials
- Role-based admin and boarder portals
- Room availability and occupancy management
- Applicant intake, viewing scheduling, reschedule/cancel requests
- Boarder profiles and room assignment
- Monthly rent, electricity, and water billing
- Rolling six-month electricity history
- Private receipt upload and admin approve/reject workflow
- Payment status tracking and prior-month carryover
- Promise-to-pay reminders
- Complaint/request workflow
- Printable boarder statements
- Audit logging
- Scheduled cleanup/reminder jobs
- Optional Semaphore SMS integration

---

## Run the portfolio demo locally

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm run demo
```

Open `http://localhost:5173`.

Use the **Admin Demo** and **Boarder Demo** buttons in the top navigation. No credentials are required.

To verify the production bundle and the static demo bundle:

```bash
npm run build
npm run build:demo
```

---

## Publish the clickable demo with GitHub Pages

This repository includes `.github/workflows/deploy-demo.yml`.

1. Create a new GitHub repository and push this project to the `main` branch.
2. In GitHub, open **Settings → Pages**.
3. Set the source to **GitHub Actions** if GitHub has not selected it automatically.
4. Open the **Actions** tab and confirm `Deploy portfolio demo to GitHub Pages` succeeds.
5. GitHub will show the public Pages URL. Add that URL to your portfolio project card.

The workflow runs:

```bash
npm ci
npm run build:demo
```

with `VITE_DEMO_MODE=true`, so the hosted demo stays disconnected from Cloudflare resources.

---

## Full-stack local development

### 1. Install dependencies

```bash
npm ci
```

### 2. Create local environment variables

Copy `.dev.vars.example` to `.dev.vars` and replace the sample values:

```text
SETUP_SECRET="use-a-long-random-secret"
BOOTSTRAP_ADMIN_PASSWORD="use-a-strong-temporary-password"
BOOTSTRAP_ADMIN_EMAILS="admin1@example.com,admin2@example.com"
PUBLIC_SITE_URL="http://localhost:5173"
```

`BOOTSTRAP_ADMIN_PASSWORD` must be at least 10 characters and contain letters and numbers.

Do not commit `.dev.vars`.

### 3. Apply local D1 migrations

```bash
npm run db:local
```

### 4. Start the Worker and React app

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Worker API: `http://localhost:8787`
- Vite proxies `/api/*` to the Worker during local development.

### 5. Bootstrap configured admins

Example with curl:

```bash
curl -X POST http://localhost:5173/api/setup/bootstrap \
  -H "x-setup-secret: YOUR_SETUP_SECRET"
```

The accounts listed in `BOOTSTRAP_ADMIN_EMAILS` are created with the configured temporary password and must change it after login.

---

## Cloudflare production deployment

### Create D1

```bash
npx wrangler login
npx wrangler d1 create casa-vicenta-db --location=apac
```

Copy the returned D1 `database_id` into `wrangler.jsonc`, replacing the all-zero placeholder.

Apply migrations:

```bash
npm run db:remote
```

### Create the private R2 bucket

```bash
npx wrangler r2 bucket create casa-vicenta-receipts
```

Keep the receipt bucket private. Receipts should only be served through authenticated admin routes.

### Configure production secrets

```bash
npx wrangler secret put SETUP_SECRET
npx wrangler secret put BOOTSTRAP_ADMIN_PASSWORD
npx wrangler secret put BOOTSTRAP_ADMIN_EMAILS
```

Optional SMS configuration:

```bash
npx wrangler secret put SEMAPHORE_API_KEY
npx wrangler secret put SEMAPHORE_SENDER_NAME
```

If applicant SMS links should point to your deployed website, also configure `PUBLIC_SITE_URL` in your Cloudflare environment.

### Deploy

```bash
npm run deploy
```

Then call `/api/setup/bootstrap` once using your `SETUP_SECRET`, sign in, and immediately replace the temporary passwords.

---

## Repository structure

```text
.
├── .github/workflows/deploy-demo.yml   # GitHub Pages demo deployment
├── migrations/                         # D1 schema migrations
├── src/
│   ├── components/                     # Shared UI components
│   ├── lib/api.js                      # Real API / demo API switch
│   ├── lib/demoApi.js                  # Safe sample-data backend for portfolio mode
│   └── pages/                          # Public, admin, and boarder screens
├── worker/index.js                     # Cloudflare Worker API
├── wrangler.jsonc                      # Cloudflare bindings/config
├── .env.demo                           # Enables fixture-backed portfolio mode
└── vite.config.js
```

## Demo vs production

| Area | Portfolio demo | Production |
| --- | --- | --- |
| Hosting | GitHub Pages | Cloudflare Workers |
| Data | In-browser sample fixtures | D1 |
| Receipt files | Simulated only | Private R2 |
| Authentication | One-click demo roles | Secure sessions |
| Writes | Simulated | Persisted |
| SMS | Disabled/simulated | Optional Semaphore integration |

## Before making the repository public

- Confirm `.dev.vars` is not present.
- Do not include `.wrangler/`, `node_modules/`, `dist/`, database files, or real receipt files.
- Use only the placeholder D1 ID in this public portfolio copy.
- Keep real names, email addresses, phone numbers, banking information, and tenant/applicant data out of the repository.
- Rotate credentials if they were ever committed to Git history.

See `SECURITY.md` for the public-repository safety notes.

## Portfolio description

**Casa Vicenta Boarder Management System** — a full-stack property management platform that centralizes room occupancy, applicant intake, monthly utility billing, payment receipt verification, boarder statements, complaints, and admin operations. Built with React and Cloudflare’s serverless stack, with a separate fixture-backed demo mode for safe public showcasing.
