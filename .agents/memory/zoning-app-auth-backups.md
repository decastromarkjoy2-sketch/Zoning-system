---
name: Zoning app auth & backups
description: Password hashing convention and local auto-backup design used in the municipal zoning system's api-server.
---

Passwords in the `users` table are bcrypt-hashed (via `bcryptjs`, in `artifacts/api-server/src/lib/password.ts`). Login transparently upgrades any legacy plaintext password to a bcrypt hash on successful sign-in, so mixed old/new rows are handled without a separate migration step.

**Why:** an earlier seed left demo accounts with a literal placeholder password (`"password_hash"` stored as plaintext) that didn't match the documented demo credential (`"password"`), breaking login. Always verify a seeded/demo credential actually authenticates before documenting it — don't assume seed data matches docs.

**How to apply:** when adding/resetting users or demo credentials in this app, hash with `hashPassword()` from `lib/password.ts` rather than writing plaintext, and confirm login works via a real request before telling the user it's fixed.

Automatic local backups run from `artifacts/api-server/src/lib/backup-scheduler.ts`: a `pg_dump` runs on a timer (default every 24h, first run ~60s after server start) and writes timestamped `.sql` files to `artifacts/api-server/backups/` (gitignored), pruning to the 14 most recent. Status/history is exposed via `/api/backup/status`, manual trigger via `/api/backup/run-now`, and per-file download via `/api/backup/local/:filename` — all restricted to administrator/planning_officer roles.
