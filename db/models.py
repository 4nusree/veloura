import os
import sqlite3
from flask import request, session

DB_PATH = os.environ.get('DB_PATH', 'database.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def add_column_if_missing(conn, table, col_def):
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
    except Exception:
        pass


def log_action(conn, action, entity, entity_id, username, detail=""):
    conn.execute(
        "INSERT INTO audit_log (action, entity, entity_id, username, detail) VALUES (?, ?, ?, ?, ?)",
        (action, entity, entity_id, username, detail)
    )


def get_or_create_variant(conn, product_id, size, color):
    size = (size or "One Size").strip() or "One Size"
    color = (color or "Default").strip() or "Default"
    row = conn.execute(
        "SELECT id FROM product_variants WHERE product_id=? AND size=? AND color=?",
        (product_id, size, color)
    ).fetchone()
    if row:
        return row["id"]
    cur = conn.execute(
        "INSERT OR IGNORE INTO product_variants (product_id, size, color, stock) VALUES (?, ?, ?, 0)",
        (product_id, size, color)
    )
    if cur.lastrowid:
        return cur.lastrowid
    row = conn.execute(
        "SELECT id FROM product_variants WHERE product_id=? AND size=? AND color=?",
        (product_id, size, color)
    ).fetchone()
    return row["id"] if row else None


def require_admin_session():
    return session.get("role") == "admin"


def get_actor_from_session():
    return session.get("username", request.headers.get("X-Username", "system"))
