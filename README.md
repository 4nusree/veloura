# Veloura — Fashion E-Commerce

## Overview
A premium fashion e-commerce site built with **Flask (Python)** + **vanilla JavaScript** + **SQLite**.

## Stack
- **Backend**: Flask, SQLite (via `sqlite3`), `flask-cors`
- **Frontend**: Vanilla JS, Jinja2 templates, custom CSS
- **Charts**: Chart.js (CDN, admin only)

## Project Structure
```
app.py                  — Flask app, all API routes, DB init & migrations
database.db             — SQLite database
templates/
  index.html            — Home page (hero slider, categories, trending)
  shop.html             — Shop/browse page
  product.html          — Product detail page
  cart.html             — Shopping cart
  wishlist.html         — Saved items
  checkout.html         — Checkout flow
  login.html            — Login / register
  admin.html            — Admin dashboard (sidebar layout, 5 tabs)
static/
  css/style.css         — Global site styles
  css/admin.css         — Admin dashboard styles
  js/script.js          — Global site JS (auth, cart, products, etc.)
  js/admin.js           — Admin dashboard JS (all 5 tabs)
  images/               — Static assets (logo, hero/category images)
```

## Database Schema
- **users**: id, username, password (SHA-256), role, full_name, email, phone, disabled, created_at
- **products**: id, name, code, price, image, category, sizes, colors, images (JSON), video, stock, description, active
- **orders**: id, items (JSON), total, username, customer_name, phone, address, status, notes, payment_method, created_at
- **reviews**: id, product_id, username, rating, comment, image_url, created_at
- **audit_log**: id, action, entity, entity_id, username, detail, created_at

## Admin Dashboard (5 Tabs)
1. **Dashboard** — Stats cards (products, 30-day orders/revenue, pending, low-stock), Sales area chart, Orders-by-status doughnut, Top-5 products bar chart, live audit log feed
2. **Products** — Searchable/filterable/paginated table, add/edit/delete via modal, bulk activate/deactivate, CSV import/export, color variant images (up to 8 per color)
3. **Orders** — Paginated table, filter by status & date range, inline status dropdown, order detail modal (customer info, timeline, line items, notes), CSV export
4. **Users** — Paginated list, search by name/email, filter by role, user profile modal, toggle role (with confirmation), enable/disable account, revoke sessions
5. **Inventory** — Products below configurable threshold, out-of-stock highlighted red, inline stock adjustment (±)

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List all products |
| POST | /api/products | Add product (admin) |
| PUT | /api/products/:id | Edit product (admin) |
| DELETE | /api/products/:id | Delete product (admin) |
| POST | /api/products/bulk-status | Bulk activate/deactivate (admin) |
| GET | /api/products/export | CSV export (admin) |
| POST | /api/products/import | CSV import (admin) |
| GET | /api/orders | List orders with filters/pagination (admin) |
| POST | /api/orders | Place order |
| PUT | /api/orders/:id/status | Update order status (admin) |
| PUT | /api/orders/:id/notes | Update internal notes (admin) |
| GET | /api/orders/export | CSV export (admin) |
| GET | /api/users | List users (admin) |
| PUT | /api/users/:id/role | Update role (admin) |
| PUT | /api/users/:id/status | Enable/disable user (admin) |
| DELETE | /api/users/:id/sessions | Revoke sessions (admin) |
| GET | /api/stats | Enhanced stats (admin) |
| GET | /api/admin/chart/sales | 30-day sales data |
| GET | /api/admin/chart/orders-by-status | Status distribution |
| GET | /api/admin/chart/top-products | Top 5 products |
| GET | /api/admin/audit-log | Audit log feed |
| GET | /api/inventory | Low-stock products |
| PUT | /api/inventory/:id/stock | Adjust stock (admin) |
| POST | /api/register | Register |
| POST | /api/login | Login |
| GET | /api/reviews | Get reviews |
| POST | /api/reviews | Post review |

## Auth Pattern
Admin APIs check `X-User-Role: admin` header. Frontend stores `userRole` and `username` in `localStorage`.

## Running
The `Start application` workflow runs `python app.py` on port 5000.
