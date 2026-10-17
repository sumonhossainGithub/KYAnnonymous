# KYAnonymous Architecture Documentation

KYAnonymous is designed as a **Modular Monolith** using Laravel 13, Inertia 3, React 19, PostgreSQL 18, Valkey 9.1, and Laravel Reverb (§1).

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    Client["Browser Client (React 19 / Inertia 3)"]
    Proxy["Caddy 2.11.4 (TLS Termination & Reverse Proxy)"]
    App["Laravel 13 Application (PHP 8.5-FPM)"]
    PG[("PostgreSQL 18.6 (Permanent Source of Truth)")]
    VK[("Valkey 9.1.1 (Ephemeral Cache / Rate Limit / Scaling)")]
    Rev["Laravel Reverb 1.12 (Pusher-compatible WebSocket Server)"]

    Client -- "HTTPS (No Trackers / Strict CSP)" --> Proxy
    Client -- "WSS (Authenticated WebSockets)" --> Proxy
    Proxy -- "FastCGI" --> App
    Proxy -- "WebSocket Reverse Proxy" --> Rev
    App -- "PDO (Transactions & Normalized Schemas)" --> PG
    App -- "HMAC Rate Limits & Ephemeral Keys" --> VK
    App -- "HTTP Auth & Event Dispatch" --> Rev
    Rev -- "Pub/Sub Scaling Mode" --> VK
```

---

## 2. Authentication Flow (§8, §10, §29)

```mermaid
sequenceDiagram
    autonumber
    actor User as Visitor
    participant Server as AuthController
    participant DB as PostgreSQL
    participant Limiter as Valkey Limiter

    User->>Server: POST /register (display_name, username, gender, password)
    Server->>Limiter: Check HMAC-derived rate limit
    Server->>DB: Check username_normalized uniqueness
    Server->>Server: Hash password with Argon2id
    Server->>Server: Generate single-use recovery code (XXXX-XXXX-XXXX)
    Server->>DB: Insert User & Hashed Recovery Code
    Server->>DB: Create Session (user_id, payload - NO IP, NO User Agent)
    Server-->>User: 302 Redirect to /recovery-code (code displayed ONCE)
```

---

## 3. Atomic Voting Flow (§14)

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated User
    participant Controller as PostController
    participant DB as PostgreSQL

    User->>Controller: POST /posts/{id}/vote (vote: +1 or -1)
    Controller->>DB: Begin Database Transaction
    Controller->>DB: SELECT * FROM post_votes WHERE post_id = ? AND user_id = ? FOR UPDATE
    alt Vote exists and matches clicked vote
        Controller->>DB: DELETE FROM post_votes (Toggles vote off)
    else Vote exists with opposite direction or new vote
        Controller->>DB: UPDATE or INSERT post_votes (Upsert)
    end
    Controller->>DB: Recalculate upvotes_count, downvotes_count, score
    Controller->>DB: UPDATE posts SET score = ?, ...
    Controller->>DB: Commit Transaction
    Controller-->>User: Reconciled Vote State
```

---

## 4. Realtime Chat Message Architecture (§19, §20)

```mermaid
sequenceDiagram
    autonumber
    actor User as Chat Participant
    participant App as CommunityController
    participant DB as PostgreSQL
    participant Rev as Laravel Reverb
    actor Peers as Connected Peers

    User->>App: Authenticated HTTP POST /chat/{slug}/message
    App->>App: Verify session & EnsureNotBanned middleware
    App->>App: Rate limit check using pseudonymous HMAC digest
    App->>DB: Persist ChatMessage record to PostgreSQL
    App->>Rev: Broadcast ChatMessageCreated event (after commit)
    Rev-->>Peers: Push message payload to subscribed channel
```
