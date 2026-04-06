# Veloura Post-Refactor Audit (Flask + Vanilla JS)

Date: 2026-04-06
Scope: Code + schema audit after session auth, CSRF, bcrypt, normalization, and modularization refactor.

---

## 1) System Health Score

**7.4 / 10**

The security posture is significantly improved versus the pre-refactor state (server session auth, CSRF guard, role checks from session, bcrypt migration logic, safer DOM rendering, normalized order tables in code). However, production readiness is still blocked by architectural and operational gaps (monolithic `app.py`, duplicate admin frontend logic, limited automated verification in this environment, and migration/runtime dependency risks).

---

## 2) Critical Issues (Remaining)

1. **Runtime dependency risk: `bcrypt` import is hard-required and failed in this environment.**
   - `services/auth_service.py` imports `bcrypt` at module import time.
   - If deployment image/environment misses `bcrypt`, app startup fails immediately.

2. **Backend modularization is incomplete (single large `app.py` still owns almost all behavior).**
   - `routes/*.py` files are blueprint placeholders only.
   - Most auth/product/order/admin/reset logic still resides in `app.py`.

3. **Database migration may not have been executed in deployed DB snapshot.**
   - Repository `database.db` currently lacks `order_items` and `product_variants` tables even though code expects/creates them at startup.
   - If startup migration is skipped/blocked in production, normalized features will break.

---

## 3) Regression Bugs / Behavior Risks

### A) Regression Test Analysis (requested flows)
- **Login / Register flow:** API endpoints are present and session-based; login sets server session user + role + csrf token.
- **Session persistence across pages:** `/api/me` is implemented and `syncAuthFromServer()` hydrates client storage.
- **Admin access control:** admin API checks use server session role (`require_admin_session()`), not header trust.
- **Product CRUD:** endpoints exist and are admin-gated.
- **Cart & wishlist:** still localStorage-driven on frontend.
- **Checkout + order creation:** API persists normalized `order_items` and links variants.
- **WhatsApp integration:** client opens `wa.me` URL post-order.
- **Forgot/reset flow:** token creation + expiration checks exist.

### B) Regressions / inconsistencies found
1. **Duplicate admin implementations still active** (`script.js` + `admin.js` both loaded in `admin.html`), causing maintenance drift and potential double-binding/duplicate network calls.
2. **Legacy role headers still sent by frontend** (`X-User-Role`, `X-Username`) even though backend no longer trusts them for auth. Security is improved, but client/server contract is noisy and confusing.
3. **Checkout quantity risk:** checkout total calculation is per item entry and does not clearly model quantity in checkout view code path (can diverge if cart format evolves).
4. **Potential silent UI failures:** many frontend `.catch(function () {})` blocks hide errors without user feedback.

---

## 4) Security Gaps (Post-Upgrade)

## Auth + Session Validation
- ✅ Session-based auth is implemented (`session["user_id"]`, `session["username"]`, `session["role"]`).
- ✅ `/api/me` returns authenticated state from server session.
- ✅ `/api/logout` clears session.
- ✅ Admin authorization reads server session role, not client role header.

### Remaining gaps
1. **Audit log actor spoofing risk (non-auth critical):** `get_actor_from_session()` falls back to `X-Username` header when session username is absent. This can taint audit trail attribution for unauthenticated mutations that still log actions.
2. **Reset-password email error leakage:** SMTP exception details are returned directly to clients.
3. **No explicit login/reset throttling or lockout controls in code.**

## CSRF Validation
- ✅ Global `before_request` enforces CSRF for all mutating `/api/*` routes except `/api/csrf-token`.
- ✅ Frontend wraps `fetch` to auto-attach `X-CSRF-Token` for mutating same-origin API requests.

### Remaining gaps
1. **Token lifecycle is session-bound only; no explicit age/rotation policy beyond session clear/login reset.**
2. **Frontend token cache retry behavior is limited:** if session/token rotates server-side, first mutating request fails 403 without automatic token refresh-and-retry.

---

## 5) Database Consistency & Migration Status

### In code (good)
- `order_items` + `product_variants` tables include FKs and indexes.
- Migration logic exists for legacy JSON `orders.items` -> normalized `order_items` rows.
- `get_or_create_variant()` normalizes missing variant combinations at order time.

### Risks / findings
1. **Current repository DB snapshot appears pre-normalization** (missing normalized tables), indicating migration state drift between code and artifact.
2. **Migration correctness cannot be fully proven from static review alone in this environment due app startup dependency issue (`bcrypt` import failure).**

---

## 6) Backend Structure Audit

- **Expected target:** `db/`, `services/`, `routes/` modular architecture.
- **Current reality:**
  - `db/models.py` and `services/auth_service.py` are used.
  - `routes/` modules are placeholders and not carrying endpoint logic.
  - `app.py` still contains route handlers, DB initialization/migration, mail logic, seed logic, analytics, and business rules.

**Verdict:** partial modularization only.

---

## 7) Frontend–Backend Integration Audit

- ✅ `syncAuthFromServer()` exists and updates local state from `/api/me`.
- ✅ Global fetch wrapper injects CSRF token on mutating API requests.
- ⚠️ Admin frontend still sends old trust headers and duplicates admin logic across two files.
- ⚠️ Error messaging is inconsistent; several API failures are swallowed.

---

## 8) Error Handling Quality

### Good
- Backend returns structured JSON errors for most validation failures.
- CSRF failures consistently return 403 JSON.

### Problems
- Frontend silent catches reduce observability and user trust.
- Forgot-password endpoint exposes internal exception strings.

---

## 9) Performance Check

1. **N+1 query pattern in `/api/admin/chart/sales`:** one query per day (30 queries).
2. **Very large monolith app startup path includes heavy seed/backfill checks.**
3. **Admin JS duplication can trigger redundant UI/event/fetch work.**

---

## 10) Edge Case Review

- **Empty cart checkout:** server rejects (`items and total are required`) when no items.
- **Invalid reset token:** server rejects.
- **Expired CSRF token/session mismatch:** server returns 403.
- **Unauthorized admin access:** blocked by session role checks.
- **Missing product variants:** backend auto-creates variant rows via `get_or_create_variant()`.

---

## 11) Final Fix Recommendations

1. **Complete modularization now:** migrate route handlers out of `app.py` into blueprint modules and register them.
2. **Remove legacy admin/header patterns from frontend:** eliminate `X-User-Role`/`X-Username` usage and old admin code in `script.js`.
3. **Harden dependency/runtime checks:** pin and verify `bcrypt` in build; add startup health checks.
4. **Strengthen CSRF lifecycle UX:** auto-refresh token on 403 and retry once for mutating requests.
5. **Improve security hardening:** login/reset rate limiting, generic SMTP error responses, tighter CORS policy, add security headers.
6. **Optimize admin analytics queries:** aggregate sales with grouped SQL instead of per-day loop.
7. **Add automated regression suite:** auth/session/CSRF/admin/order normalization edge cases.
8. **Run and verify one-time migration in real prod DB snapshot before deploy cutover.**

---

## 12) Production Readiness Verdict

**Not yet production-ready.**

The refactor materially improved security correctness, but deployment should wait until:
- runtime dependency/install reliability is guaranteed (`bcrypt`),
- modularization debt and duplicated admin code are resolved,
- migration state is verified against the actual production DB,
- and automated post-refactor regression tests are in place.
