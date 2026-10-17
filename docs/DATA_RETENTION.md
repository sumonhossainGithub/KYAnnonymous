# Data Retention Policy — KYAnonymous

**Effective Date:** 2026-10-16  
**Guiding Principle:** Minimal collection, bounded retention, explicit deletion lifecycles (§48).

---

## 1. Stored Records & Retention Schedules

| Category | Storage Engine | Fields Retained | Retention Duration | Purge Mechanism |
|---|---|---|---|---|
| **User Identity** | PostgreSQL | Display Name, Username, Normalized Username, Password Hash, Gender (optional) | Indefinite until deleted by user or terminated by admin | Hard delete or identity anonymization to `Deleted User` |
| **Recovery Codes** | PostgreSQL | Salted Argon2id Hash of single-use recovery code | Until account password reset or rotated | Overwritten on each password change |
| **Active Sessions** | PostgreSQL | Session ID, User ID, Serialized Payload, Last Activity | 120 minutes of inactivity | Scheduled lottery & automatic ban cleanup |
| **Rate Limit Counters** | Valkey | Keyed HMAC-SHA256 digest + attempt integer | 60 to 3600 seconds | Key TTL expiration |
| **Community Posts** | PostgreSQL | Title, Plaintext Body, Author ID, Org ID, Timestamps | Indefinite unless removed by author or moderated | Soft delete / Content removal |
| **Comments & Replies** | PostgreSQL | Plaintext Body, Author ID, Parent ID, Timestamps | Indefinite; if deleted with replies, body replaced by `[deleted]` | Content nulling for tree continuity |
| **Chat Messages** | PostgreSQL | Room ID, Author ID, Message, Timestamp | 90 days active retention | Pruned via maintenance cleanup |
| **Admin Audit Logs** | PostgreSQL | Action, Admin ID, Target Public ID, Safe Metadata | 1 year | Archival for audit compliance |
| **Security Events** | PostgreSQL | Event Type, Pseudonymous HMAC Digest, Timestamp | 30 days | Automated purge |

---

## 2. Zero-Retention Elements

The following items are **NEVER** stored at any time in application storage:
- Raw Client IP Addresses (in sessions or profile records)
- Raw User-Agent strings
- Plaintext Passwords
- Plaintext Recovery Codes
- Geolocation / GPS Coordinates
- Device Fingerprints / Canvas Hashes
