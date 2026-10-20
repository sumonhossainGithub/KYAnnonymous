# KYAnonymous — Ghost AI V2 Technical Guide & Operator Manual

## 1. Overview
**Ghost AI V2** is a native, offline-capable AI chat companion engineered specifically for low-resource environments (Android Termux ARM64 with ~4 GB physical RAM). It interacts with a local `llama.cpp` OpenAI-compatible endpoint hosting the **Qwen3 4B Q4_K_M** model.

---

## 2. Operating Modes & Gating Rules

### Mode A — Low Traffic (0 to 3 Active Users)
- **Automatic Chatter:** Ghost is permitted to reply automatically to normal conversational messages.
- **Room Cooldown:** Default 300 seconds (5 minutes) between auto-replies in the same room.
- **Explicit Invocations:** Users may also invoke Ghost directly with `/ai`.

### Mode B — Busy Community (4 or More Active Users)
- **Automatic Chatter:** **STRICTLY SUPPRESSED**. Ghost never sends unsolicited replies when 4 or more users are active.
- **Explicit Invocations:** **ALWAYS ELIGIBLE**. Explicit `/ai` requests remain 100% available and functional.

### 3-Stage Active User Gating
To prevent stale replies when traffic spikes:
1. **Stage 1 (Ingress):** Checked when the user's message is received in `CommunityController`.
2. **Stage 2 (Pre-Inference):** Checked immediately before calling `llama.cpp` in `ProcessGhostChatReply`.
3. **Stage 3 (Pre-Publishing):** Re-checked right before persisting the Ghost response to SQLite. If traffic rose above 3 during slow generation, the message is discarded.

---

## 3. Slash Command Parsing

- Case-insensitive regex: `^\s*/ai(?=\s|$)`
- Supported:
  - `/ai hello`
  - `/AI amar mon kharap`
  - `/Ai explain networking`
  - `/aI Ki korcho?`
  - `/ai` (generates friendly greeting)
- Invalid commands that do not trigger Ghost:
  - `/aibot`
  - `hello /ai`
  - `@ai`
  - `/ask`
  - `ai`
- **Priority Queueing:** Valid `/ai` commands are dispatched to the `ghost-commands` queue and processed before background auto-replies.

---

## 4. Presence Tracking Engine (`PresenceTracker`)

- **Window:** 120-second sliding expiration window (`last_activity >= time() - 120`).
- **Privacy Compliance:** Uses the existing zero-IP / zero-user-agent `sessions` table.
- **De-duplication:**
  - Multiple tabs from the same authenticated user share their `user_id` and count as **1** user.
  - Distinct guest sessions without `user_id` count as individual visitors.
  - The `ghost_ai` service account is strictly excluded.

---

## 5. Mobile Concurrency & Memory Safety

- **Max Concurrency:** Strictly **1** inference process.
- **Cache Lock:** Guarded by `Cache::lock('ghost_ai_inference_lock', 300)`. If another query is generating, secondary commands wait/retry, while background auto-jobs are dropped to prevent queue backlog.
- **Queue Worker:** Runs via a single-threaded daemon:
  ```bash
  bash scripts/ghost_worker.sh
  ```
- **Timeouts:** 350-second worker job timeout accommodating ~0.1 tokens/sec mobile CPU speeds.

---

## 6. Super Admin Control Dashboard

Located at: **`/admin/ghost`** (Accessible only to users with role `SUPER_ADMIN`).

### Available Live Controls
- **Master Ghost ON/OFF:** Immediate kill switch for all Ghost AI processing.
- **Auto-Reply Toggle:** Switch automatic conversation on/off.
- **Slash Command Toggle:** Switch `/ai` command replies on/off.
- **Max Active Users for Auto-Reply:** Configurable threshold (default: 3).
- **Auto-Reply Cooldown:** Seconds between auto-replies in a room (default: 300).
- **Max Output Tokens:** Hard cap on completion tokens (default: 32).
- **Request Timeout:** HTTP socket timeout (default: 120s).
- **AI Endpoint URL:** Editable API endpoint.

### Real-Time Diagnostics & Emergency Buttons
- **Test AI Connection:** Pings `http://127.0.0.1:8081` and measures HTTP latency.
- **Cancel Queue:** Immediately flushes pending `ghost-commands` and `ghost-auto` jobs and releases any lingering inference lock.
- **Live Metrics:** Real-time active user breakdown (members vs guests), queue backlog count, inference lock state, and last error/success telemetry.

---

## 7. Termux Deployment Guide

### Step 1: Start `llama.cpp` Server
```bash
./llama-server \
  -m /path/to/Qwen3-4B-Q4_K_M.gguf \
  --port 8081 \
  --host 127.0.0.1 \
  -c 2048 \
  --threads 4
```

### Step 2: Run Migrations & Cache Config
```bash
cd ~/KYAnonymous
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

### Step 3: Start the Ghost AI Queue Worker
```bash
bash scripts/ghost_worker.sh
```

---

## 8. Rollback & Troubleshooting

### Emergency Disable (Instant)
- **Web UI:** Navigate to `/admin/ghost` and toggle **Master Ghost** to **OFF**.
- **CLI / Artisan:**
  ```bash
  php artisan tinker --execute="App\Models\AppSetting::set('ghost_ai_enabled', 'false');"
  ```
- **Environment:** Set `GHOST_AI_ENABLED=false` in `.env`.

### Common Issues
1. **Chat works but Ghost doesn't reply to `/ai`:**
   - Check if queue worker is running: `ps aux | grep queue:work`
   - Check AI server ping in `/admin/ghost`
   - Check queue table: `php artisan queue:monitor database:ghost-commands,ghost-auto`
2. **Worker stalled on slow completion:**
   - Click "Cancel Queue" in `/admin/ghost` or run `php artisan queue:clear database --queue=ghost-commands,ghost-auto`.
