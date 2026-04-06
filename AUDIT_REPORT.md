# Veloura Full-Stack Audit Report (Flask + Vanilla JS)

Date: 2026-04-05

## 1) Summary (Overall Health Score)

**Overall health score: 5.6 / 10 (prototype-ready, not production-ready).**

This codebase delivers a broad feature surface (catalog, cart, checkout, reviews, admin dashboards), but the implementation is currently **high-risk for production** due to weak authentication/authorization controls, insecure password strategy, missing data integrity constraints, and monolithic architecture.

---

## 2) Critical Issues (Must Fix Immediately)

1. **Admin authorization is fully client-spoofable.**
   Backend admin checks trust a request header (`X-User-Role`) instead of a server-validated identity/session, so any client can call admin APIs by setting that header. This affects products, orders, users, inventory, and admin messages endpoints.

2. **Authentication is insecure and state is client-trusted.**
   Login returns username/role and frontend stores these in `localStorage`, then uses those client values for privileged requests.

3. **Password hashing uses plain SHA-256 without salt/work factor.**
   This is vulnerable to offline cracking and does not meet modern password storage best practices.

4. **Stored/reflected XSS risk in product reviews and auth header rendering.**
   User-supplied review fields and localStorage username are interpolated into `innerHTML` without escaping.

5. **Server is launched with `debug=True`.**
   This is unsafe for production and may expose internals.

---

## 3) Medium Issues

1. **Monolithic backend architecture (single 1730-line app file).**
   Routes, schema bootstrapping, migration-like logic, mail, analytics, and business logic are all in one module.

2. **Schema lacks foreign keys and relational integrity.**
   Orders store `items` as JSON text, reviews reference `product_id` without FK enforcement, and no explicit relational model exists for line items/variants.

3. **No pagination on public product APIs and several admin queries.**
   `/api/products` returns full catalog; contact messages endpoint returns all messages.

4. **Validation is inconsistent and minimal server-side.**
   Phone/email format checks mostly live in frontend; server accepts many fields with weak constraints.

5. **Inefficient analytics queries.**
   Sales chart runs one SQL query per day (30 queries); top-products parses JSON for every order row in Python.

6. **Duplicate/overlapping admin logic in two frontend bundles.**
   Admin logic appears in `script.js` and `admin.js`, increasing maintenance and drift risk.

---

## 4) Minor Improvements

1. Replace large inline page styles/scripts with modular static assets (checkout page has extensive inline CSS/JS).
2. Standardize category taxonomy (`Kurthi`, `kurtis`, hard-coded name heuristics) and move classification logic to normalized data.
3. Add image optimization pipeline (responsive `srcset`, modern formats) for heavy visual catalog pages.
4. Reduce repeated DOM/string template code; move toward componentized rendering helpers.
5. Add automated tests (API contract tests, auth tests, critical flows).

---

## 5) Security Risks (Separate Section)

### A. Authentication & Authorization
- **Critical:** `require_admin()` validates only `X-User-Role` header.
- Frontend writes `user_role` and `user_name` to localStorage after login and sends them as authority.
- Account disable flag exists in schema but login query does not enforce `disabled = 0`.

### B. Password & Account Security
- **Critical:** SHA-256 only (`hashlib.sha256`) with no per-user salt/work factor.
- Password minimum length of 6 is weak.
- No visible lockout/rate limiting on login or reset endpoints.

### C. XSS
- Review rendering injects unescaped `username`, `comment`, and `image_url` into `innerHTML`.
- Header auth widget injects localStorage username via `innerHTML`.

### D. Token Handling / Reset
- Reset tokens are random and expiring (good), but stored in plaintext DB (acceptable for prototypes; stronger to store hashed token).
- Error from SMTP is returned directly to client with exception string.

### E. CSRF / CORS / API Hardening
- Global CORS is enabled without explicit origin restrictions.
- No CSRF strategy for state-changing endpoints.
- No security headers policy (CSP/HSTS/etc.) or request rate limiting.

### F. SQL Injection
- Most SQL is parameterized (`?` placeholders) and dynamic SQL pieces are built from fixed clauses.
- Current SQLi risk appears low, but preserve strict allowlists and avoid string-building expansion.

---

## 6) Performance Improvements

1. **API & DB**
   - Add pagination/filters for `/api/products` and messages APIs.
   - Add indexes: `orders(created_at)`, `orders(status, created_at)`, `users(username)`, `users(email)`, `products(category, active, stock)`, `password_resets(token, expires_at)`.
   - Replace N+1 daily sales loop with grouped SQL query by date.
   - Move top-products to normalized `order_items` table + aggregate SQL.

2. **Frontend**
   - Keep lazy-loading on all product/card images consistently.
   - Serve compressed/resized images; avoid large originals for thumbnails.
   - Reduce long initial JS payload by splitting page-specific logic.

3. **Runtime**
   - Add WSGI server (gunicorn/uwsgi), caching strategy, and background jobs for email.

---

## 7) Suggested Refactoring Plan

### Phase 1 (Security Stabilization)
1. Introduce real auth: server-side session (Flask-Login) or signed JWT with server verification.
2. Replace header-based admin checks with decorator validating authenticated user role from trusted token/session.
3. Migrate password hashing to `bcrypt`/`argon2` with adaptive cost.
4. Fix XSS vectors by escaping/sanitizing all untrusted data before HTML insertion.
5. Disable debug mode; add secure env-based configuration.

### Phase 2 (Architecture)
1. Split monolith into modules:
   - `routes/` (auth, products, orders, admin)
   - `services/` (auth, orders, notifications)
   - `models/` or repository layer
   - `db/migrations/`
2. Move inline checkout JS/CSS into `static/js/checkout.js` and `static/css/checkout.css`.
3. Consolidate admin JS into a single source of truth (`admin.js`) and remove admin logic from global script.

### Phase 3 (Data Model)
1. Normalize schema with FKs:
   - `orders`
   - `order_items(order_id, product_id, variant_id, qty, unit_price)`
   - `product_variants(product_id, size, color, sku, stock)`
2. Add migration tool (Alembic/Flask-Migrate).
3. Add constraints and indexes.

### Phase 4 (Operational Hardening)
1. Centralized logging and error monitoring.
2. CI pipeline with tests + lint + security checks.
3. Add rate limiting and abuse protections.
4. Document deployment and incident response runbooks.

---

## 8) Final Production Checklist

- [ ] Replace SHA-256 with Argon2/bcrypt and migrate existing hashes.
- [ ] Implement real authenticated sessions/JWT; remove trust in client role headers.
- [ ] Enforce RBAC server-side for all admin endpoints.
- [ ] Fix XSS in reviews/auth header rendering; add CSP.
- [ ] Disable Flask debug; add environment-based config and secret management.
- [ ] Restrict CORS origins and add CSRF strategy.
- [ ] Add DB migrations + foreign keys + indexes.
- [ ] Normalize orders/variants data model.
- [ ] Add API pagination and request validation schemas.
- [ ] Add test coverage for auth, checkout, admin, and reset flows.
- [ ] Add structured logging/monitoring and production WSGI setup.

---

## Appendix: What is implemented today

- Multi-page frontend with templates for landing/shop/product/cart/wishlist/checkout/login/admin.
- Product catalog with sizes/colors and optional image maps.
- Cart/wishlist in browser storage.
- Checkout flow posting orders and opening WhatsApp order summary.
- Admin dashboard with products/orders/users/inventory/messages + chart widgets.
- Password reset email workflow with token expiration.

