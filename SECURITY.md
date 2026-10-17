# KYAnonymous Security Architecture & Threat Model

This document outlines the proactive controls, mitigations, and known boundaries of KYAnonymous (§86).

---

## 1. Threat Model & Mitigations

| Threat | Risk Level | Mitigation Implemented | Remaining Limitations |
|---|---|---|---|
| **Credential Theft / Brute Force** | High | Argon2id hashing parameters (`memory=65536, threads=2, time=3`). Pseudonymous HMAC rate-limiting on login and recovery attempts. Constant-time dummy hash verification prevents username enumeration (§46). | Weak user-chosen passwords. Mitigated via minimum 8-character complexity rule. |
| **IP Address Exposure & Tracking** | High | Sessions table removes `ip_address` and `user_agent`. Rate limiters key exclusively on non-reversible HMAC-SHA256 digests (`RATE_LIMIT_HMAC_SECRET`). Admin panel never renders client IPs (§29). | ISP and upstream reverse-proxy connection metadata. Documented honestly in privacy policy (§29, §49). |
| **Cross-Site Scripting (XSS)** | High | Community content is strictly plain-text. No raw HTML or unsanitized Markdown. ESLint flat config enforces AST rejection of `dangerouslySetInnerHTML` (§42). Strict Content-Security-Policy (§43). | Browser-level bugs in DOM rendering. |
| **Cross-Site Request Forgery (CSRF)** | Medium | Laravel CSRF token verification enforced on all state-changing routes (`POST`, `PUT`, `DELETE`). SameSite cookies set to `Lax` (§40). | None for browser interactions. |
| **SQL Injection** | Critical | Eloquent ORM and parameterized queries exclusively. Raw SQL queries disallowed for untrusted user inputs (§39). | None. |
| **Race Conditions in Voting** | Medium | Atomic PostgreSQL transaction with row-level locks (`SELECT ... FOR UPDATE`) and composite unique index `(post_id, user_id)` (§14). | None; concurrent requests serialize safely. |
| **Privilege Escalation** | Critical | Middleware `EnsureSuperAdmin` checks both `role === 'SUPER_ADMIN'` and `status === 'ACTIVE'`. Database partial unique index ensures only one Super Admin can ever exist (§22, §26). | Server root / database direct access by host administrator. |
| **Banned User WebSocket Access** | Medium | HTTP POST message sending checks ban status; ban action purges all user sessions in PostgreSQL (§20, §37). | Reverb does not drop active TCP sockets instantly; mitigated by session termination and reject-on-post. |
