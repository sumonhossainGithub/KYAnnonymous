# KYAnonymous

> **Speak Freely. Stay Anonymous.**

A privacy-focused, pseudonymous community platform engineered with **Laravel 13**, **React 19**, **Inertia 3**, **PostgreSQL 18**, **Valkey 9.1**, and **Laravel Reverb**.

Designed to collect the absolute minimum data necessary: **no email, no phone number, no real identity, no advertising trackers, and zero raw IP addresses in sessions.**

---

## 1. Verified Technology Stack

All dependencies are 100% free and open-source (verified against active package managers on 2026-10-16):

- **Backend:** PHP 8.5.0 / Laravel 13.37.0 / Inertia Laravel 3.5.1 / Laravel Reverb 1.12.0
- **Frontend:** React 19.3.1 / TypeScript 6.0.2 / Vite 8.3.4 / Tailwind CSS 4.3.3 / ESLint 10.12.0
- **Database & Cache:** PostgreSQL 18.6 / Valkey 9.1.1
- **Proxy & TLS:** Caddy 2.11.4
- **Testing & QA:** Pest 4.7.8 / PHPUnit 12.5.33 / Playwright 1.64.1 / k6 2.x

Complete version provenance and verification notes are documented in [`docs/VERIFIED_STACK.md`](docs/VERIFIED_STACK.md).

---

## 2. Key Architectural Decisions

1. **Modular Monolith:** Single unified repository pairing Laravel 13 with React 19 via Inertia 3. No brittle API/SPA split.
2. **Zero Raw IP Storage (§29):** Default `ip_address` and `user_agent` columns have been eliminated from the `sessions` table. Rate limiting keys strictly on keyed non-reversible HMAC-SHA256 digests (`RATE_LIMIT_HMAC_SECRET`).
3. **Argon2id & Single-Use Recovery (§9, §10):** Cryptographically secure passwords hashed with tuned Argon2id parameters. Password recovery utilizes single-use random recovery codes shown **only once**.
4. **Single Super Admin (§22):** Exactly one Super Admin account is permitted in the entire system, enforced both by the application CLI and a PostgreSQL partial unique index.
5. **Atomic Voting (§14):** Upvotes and downvotes are computed transactionally (`SELECT ... FOR UPDATE`) with a composite unique index preventing race conditions or duplicate voting.
6. **HTTP-Driven Chat with WebSocket Broadcasts (§19, §20):** Messages are sent via authenticated HTTP POST for strict authorization, rate limiting, and ban checks, before broadcasting through Reverb.
7. **Ghost AI V2 Companion:** Integrated offline-capable AI companion running on a local ARM64 `llama.cpp` inference engine. Features intelligent Mode A/B traffic gating (auto-reply only when active users ≤ 3, explicit `/ai` commands always supported), strict single-thread mobile concurrency protection, and real-time Super Admin controls (`/admin/ghost`). Documented in [`docs/GHOST_AI.md`](docs/GHOST_AI.md).

---

## 3. Local Development Setup

### Universe interface and community chat

The interface includes an animated starfield, a constellation linked to real chat rooms, a community journal, and responsive navigation. The sidebar's **Pause gentle motion** control is saved on the device; operating-system reduced-motion preferences are also respected.

Anyone can browse `/chat`. Active signed-in members can join any open room, send messages, and create up to three public rooms per hour. The migration adds three starter rooms and preserves existing conversations. Room names support Unicode, and repeated names get distinct URLs.

Chat refreshes messages every 2.5 seconds while the page is open, using Inertia polling; no separate Reverb process is needed for this chat interface. Each room displays its latest 50 messages. A new message gently expands the connection illustration. This is polling, not a WebSocket broadcast implementation.

Run `npm run test:ui` with Vite running to exercise the interface with two browser sessions. It uses a disposable SQLite database on port 8012, removes test data afterward, and saves screenshots under `storage/app/ui-review/`. On Windows it uses installed Microsoft Edge and prefers the installed Herd PHP binary; `PHP_BINARY` can override the executable. The PHP tests use an isolated in-memory SQLite database through `phpunit.xml`.

### Prerequisites
- PHP 8.4.1+ for the locked dependencies (Host tested with PHP 8.5) with `pdo_pgsql` / `pdo_sqlite`, `intl`, `mbstring`
- Composer 2.8+
- Node.js 24 LTS & npm

### Setup Instructions

1. **Clone and Install Dependencies:**
   ```bash
   git clone <repo-url> KYAnonymous
   cd KYAnonymous
   composer install
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. **Run Database Migrations:**
   ```bash
   php artisan migrate
   ```

4. **Create the Single Super Admin Account:**
   ```bash
   php artisan app:create-super-admin
   ```
   *Follow the interactive prompt to set username, display name, and password.*

5. **Build and Serve:**
   ```bash
   # Terminal 1: Frontend Dev Server
   npm run dev

   # Terminal 2: Application Server
   php artisan serve --port=8000
   ```
   Open **http://localhost:8000** in your browser.

### Mobile layout verification

Run `npm run test:responsive` with Vite running to check public, authentication, member, and admin pages at 320, 390, 540, 640, 760, 768, 1024, and 1440 pixel widths. The 640 pixel check uses a short landscape viewport. Checks include long content, nested comments, mobile navigation and keyboard focus, the report dialog, chat submission, and horizontally scrollable admin tables. All test data uses a disposable SQLite database on port 8013. Screenshots and results are saved under `storage/app/responsive-review/`. Windows uses installed Microsoft Edge and Herd PHP; `PHP_BINARY` can override PHP.

### Windows / PowerShell

If `php -v` shows XAMPP's PHP 8.2, use the installed Herd PHP 8.5 executable for this project. Keep these two terminals open from the project folder:

```powershell
# Terminal 1
npm run dev

# Terminal 2
& "$env:USERPROFILE\.config\herd-lite\bin\php.exe" artisan serve --host=127.0.0.1 --port=8000
```

Open **http://localhost:8000**, which serves the application. Port 5173 serves Vite's development assets. If both servers are already running, refresh the application instead of starting duplicates.

### Supabase database configuration

This is a Laravel application. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are not read by the application, and adding them does not switch its database. The default `.env.example` uses a local SQLite database.

To use Supabase PostgreSQL, copy the database connection details from your Supabase project's Connect panel into Laravel's server-side `.env` values:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=<database host from Supabase>
DB_PORT=<database port from Supabase>
DB_DATABASE=postgres
DB_USERNAME=<database username from Supabase>
DB_PASSWORD="<database password>"
DB_SSLMODE=require
```

Use the database password for `DB_PASSWORD`. A publishable API key cannot authenticate a PostgreSQL connection. Enable `pdo_pgsql` in the PHP executable you run, then run `php artisan config:clear` and `php artisan migrate` using that executable. Keep database credentials server-side; do not prefix them with `VITE_` or `NEXT_PUBLIC_`.

### Blank page during development

The local Content Security Policy must allow the Vite origin for scripts, styles, and connections. `SecurityHeaders` reads that origin from `public/hot` only when `APP_ENV=local`; production keeps the same-origin policy. If the page is blank, check that both servers are running and inspect the browser console for blocked assets or connection errors.

---

## 4. Production Deployment with Docker & Caddy

The project includes an optimized multi-stage `Dockerfile` and `compose.yaml`:

```bash
# Generate production cryptographic secrets
php -r "echo 'APP_KEY=base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
php -r "echo 'RATE_LIMIT_HMAC_SECRET='.bin2hex(random_bytes(32)).PHP_EOL;"

# Start containerized services
docker compose up -d --build
```

Services started:
- `caddy:2.11.4-alpine` (Ports 80/443 with automated TLS and privacy log redaction)
- `app` (PHP 8.5-FPM production image with opcache and non-root execution)
- `postgres:18.6-alpine` (PostgreSQL 18 database, isolated on internal network)
- `valkey:9.1.1-alpine` (Valkey memory cache and Reverb pub/sub scaling)
- `reverb` (WebSocket server for live chat)

---

## 5. Testing & Quality Assurance

- **Run Automated PHP Tests (Pest 4):**
  ```bash
  vendor/bin/pest
  ```
- **Run Static Analysis (PHPStan & Larastan 3):**
  ```bash
  composer analyse
  ```
- **Run Frontend Lint & Typecheck:**
  ```bash
  npm run lint
  npm run typecheck
  ```
- **Run Production Asset Compilation:**
  ```bash
  npm run build
  ```
- **Run Load Tests (k6 2.x):**
  ```bash
  k6 run load-tests/k6-load.js
  ```

---

## 6. Honest Limitations & Cost Notice (§2B, §49)

- **Software is Free:** Every tool, dependency, and container in this project is free and open-source. However, operating a publicly accessible production deployment carries real-world costs for servers/VPS, electricity, domain registration, and bandwidth.
- **Network Metadata:** KYAnonymous provides strong application-level pseudonymity. It does not provide cryptographic anonymity against network-level routing logs, ISP surveillance, or upstream proxies outside the application boundary.
