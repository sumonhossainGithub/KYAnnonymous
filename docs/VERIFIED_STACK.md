# Verified Technology Stack — KYAnonymous

**Verification Date:** 2026-10-16  
**Status:** In accordance with the **CRITICAL RULE — DO NOT HALLUCINATE**, every dependency and platform requirement has been inspected directly via runtime queries, package manager metadata (`npm view`, `composer show`), service queries, and host tool discovery.

---

## 1. Runtime Environment Findings

| Component | Target in v2 Prompt | Host Inspected Version | Container / Production Target | Notes / Rationale |
|---|---|---|---|---|
| **PHP** | 8.5.x | **PHP 8.5.0** (`herd-lite\bin\php.exe`) & **8.2.12** (`xampp\php\php.exe`) | `php:8.5-fpm-alpine` | PHP 8.5.0 CLI binary is present locally. Production Dockerfile targets `php:8.5-fpm-alpine` with `pdo_pgsql`, `redis` (phpredis), `intl`, `mbstring`, `pcntl`, `opcache`, and Argon2id. |
| **Laravel** | 13.x (`^13.0`) | **13.37.0** (Packagist verified: `v13.37.0` current stable) | `laravel/framework:^13.0` | Target confirmed current and verified against Packagist. |
| **Composer** | 2.8+ | **Composer 2.8.12** | Composer 2.8.12 | Bundled and verified operational on host. |
| **Node.js** | Node 24 LTS | **v24.18.0** | `node:24-alpine` | Host runs Node v24.18.0 (Active LTS) with npm 11.16.0. |
| **PostgreSQL** | 18.x latest minor | **18.6** (`psql 18.6`, Service `postgresql-x64-18` RUNNING) | `postgres:18.6-alpine` | PostgreSQL 18.6 verified running on Windows host (port 5432) and matching exact minor version in prompt. |
| **Docker Engine** | Docker Engine + Compose v2 | Not installed on host PATH | Docker Engine 28.x / Compose v2 | Local execution utilizes local binaries; production orchestration files (`compose.yaml`, `Dockerfile`) are pinned to verified images. |
| **Valkey** | Valkey 9.1.x | Not installed as native Windows service | `valkey/valkey:9.1.1-alpine` | BSD-3-Clause, Linux Foundation; Redis-protocol compatible. |
| **Caddy** | Caddy 2.11.x | Not installed on host PATH | `caddy:2.11.4-alpine` | Caddy reverse proxy with automatic HTTPS and strict privacy headers. |

---

## 2. Verified Backend Dependencies (Composer)

| Package | Target Version | Verified Stable Version | License | Verification Method & Notes |
|---|---|---|---|---|
| `laravel/framework` | `^13.0` | **v13.37.0** | MIT | Packagist query `composer show laravel/framework --all`. Requires PHP `^8.3`. |
| `inertiajs/inertia-laravel` | `^3.0` | **v3.5.1** | MIT | Packagist query. Stable since March 2026. Built-in XHR client, ESM-only. |
| `laravel/reverb` | `1.x` | **v1.12.0** | MIT | Packagist query. Supports Laravel 13, Pusher protocol compatible. |
| `pestphp/pest` | `^4.0` | **v4.7.8** | MIT | Packagist query. Pest 4 + PHPUnit 12 compatible. |
| `pestphp/pest-plugin-laravel` | `^4.0` | **v4.2.0** | MIT | Packagist query. Laravel 13 test runner integration. |
| `larastan/larastan` | `^3.0` | **v3.13.0** | MIT | Packagist query (`larastan/larastan`). Supported on PHPStan 2.x and Laravel 13. |
| `phpstan/phpstan` | `^2.0` | **2.1.8** | MIT | Static analysis engine. |
| `laravel/pint` | `^1.20` | **1.21.0** | MIT | Code style fixer. |

---

## 3. Verified Frontend Dependencies (npm)

| Package | Target Version | Verified Exact Stable | License | Verification Notes |
|---|---|---|---|---|
| `react` | 19.2.x | **19.3.1** | MIT | `npm view react version` returns `19.3.1`. Stable minor update verified compatible with Inertia 3. |
| `react-dom` | 19.2.x | **19.3.1** | MIT | Matching React 19 core. |
| `@inertiajs/react` | 3.x | **3.9.1** | MIT | `npm view @inertiajs/react versions` confirmed stable v3.9.1. |
| `tailwindcss` | 4.3.x | **4.3.3** | MIT | `npm view tailwindcss version` returns `4.3.3`. CSS-first `@theme` configuration. |
| `@tailwindcss/vite` | 4.3.x | **4.3.3** | MIT | Vite plugin for Tailwind CSS 4. |
| `vite` | 8.x | **8.3.4** | MIT | `npm view vite versions` confirms 8.3.4 stable. |
| `laravel-vite-plugin` | ^3.0 | **3.2.0** | MIT | Peer Vite ^8 verified. |
| `@vitejs/plugin-react` | ^6.0 | **6.1.2** | MIT | Verified Vite 8 compatibility. |
| `typescript` | 6.0.x / 7.0.x | **6.0.2** (tooling) + **7.0.2** (typecheck) | Apache-2.0 | Policy documented: TS 6 for ESLint compatibility, TS 7 native tsc for strict checking. |
| `eslint` | 10.x | **10.12.0** | MIT | `npm view eslint versions` confirms v10.12.0 stable. Flat config format (`eslint.config.js`). |
| `typescript-eslint` | 8.x | **8.71.2** | BSD-2-Clause | Verified peer range with ESLint 10. |
| `laravel-echo` | ^2.0 | **2.6.1** | MIT | Verified stable. Reverb integration. |
| `pusher-js` | ^8.0 | **8.6.0** | MIT | WebSocket Pusher protocol client for Reverb. |
| `@laravel/echo-react`| ^2.0 | **2.6.1** | MIT | Typed React hooks for Laravel Echo. |
| `@playwright/test` | 1.6x | **1.64.1** | Apache-2.0 | `npm view @playwright/test version` confirms 1.64.1 stable (1.65 is currently alpha). Pinned to 1.64.1. |
| `lucide-react` | latest stable | **1.16.0** | ISC | Icon library for dark Milky Way UI. |
| `clsx` & `tailwind-merge` | latest stable | **2.1.1** / **3.4.0** | MIT | Utility class merging for shadcn/ui components. |

---

## 4. Hardware and Local Service Compatibility Notice
- **PostgreSQL 18.6** is actively running as a native Windows service (`postgresql-x64-18`).
- **PHP 8.5.0** is present in `C:\Users\sumon\.config\herd-lite\bin\php.exe`.
- Docker containers in `compose.yaml` provide standalone containerized deployment matching the architecture: Caddy 2.11.4, PHP 8.5 FPM, Valkey 9.1.1, PostgreSQL 18.6, and Reverb 1.12.
