import sqlite3
import hashlib
import json
import csv
import io
import os
import secrets
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request, Response, stream_with_context

# ── Mailtrap SMTP config ───────────────────────────────────────────────────────
SMTP_SERVER = os.environ.get("SMTP_SERVER", "sandbox.smtp.mailtrap.io")
SMTP_PORT   = int(os.environ.get("SMTP_PORT", "2525"))
SMTP_USER   = os.environ.get("SMTP_USER", "")
SMTP_PASS   = os.environ.get("SMTP_PASS", "")

try:
    from flask_cors import CORS
    _has_cors = True
except ImportError:
    _has_cors = False

app = Flask(__name__)
if _has_cors:
    CORS(app)

@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

DB_PATH = 'database.db'


# ===========================
# DATABASE SETUP
# ===========================
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _add_col(conn, table, col_def):
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
    except Exception:
        pass


def init_db():
    conn = get_db()

    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            username  TEXT    UNIQUE NOT NULL,
            password  TEXT    NOT NULL,
            role      TEXT    NOT NULL DEFAULT "user",
            full_name TEXT,
            email     TEXT,
            phone     TEXT
        )
    ''')

    conn.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            price       INTEGER NOT NULL,
            image       TEXT    NOT NULL,
            category    TEXT    NOT NULL DEFAULT "Women"
        )
    ''')

    conn.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            items         TEXT    NOT NULL,
            total         INTEGER NOT NULL,
            username      TEXT    NOT NULL,
            customer_name TEXT,
            phone         TEXT,
            address       TEXT,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.execute('''
        CREATE TABLE IF NOT EXISTS reviews (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id  INTEGER NOT NULL,
            username    TEXT    NOT NULL DEFAULT "Anonymous",
            rating      INTEGER NOT NULL DEFAULT 5,
            comment     TEXT,
            image_url   TEXT,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            action     TEXT NOT NULL,
            entity     TEXT NOT NULL,
            entity_id  INTEGER,
            username   TEXT,
            detail     TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.execute('''
        CREATE TABLE IF NOT EXISTS password_resets (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT NOT NULL,
            token      TEXT NOT NULL,
            expires_at DATETIME NOT NULL
        )
    ''')

    conn.execute('''
        CREATE TABLE IF NOT EXISTS contact_messages (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            email      TEXT NOT NULL,
            subject    TEXT,
            message    TEXT NOT NULL,
            read       INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # users columns
    for col in ("full_name TEXT", "email TEXT", "phone TEXT", "disabled INTEGER DEFAULT 0",
                "created_at TIMESTAMP"):
        _add_col(conn, "users", col)

    # products columns
    for col_def in (
        "sizes       TEXT DEFAULT 'S,M,L,XL'",
        "colors      TEXT DEFAULT 'Black,White,Pink'",
        "images      TEXT",
        "video       TEXT",
        "stock       INTEGER DEFAULT -1",
        "description TEXT",
        "active      INTEGER DEFAULT 1",
        "code        TEXT",
    ):
        _add_col(conn, "products", col_def)

    # orders columns
    for col in ("customer_name TEXT", "phone TEXT", "address TEXT",
                "status TEXT DEFAULT 'Pending'", "notes TEXT",
                "payment_method TEXT DEFAULT 'COD'"):
        _add_col(conn, "orders", col)

    # Backfill
    conn.execute("UPDATE products SET sizes  = 'S,M,L,XL'        WHERE sizes  IS NULL OR sizes  = ''")
    conn.execute("UPDATE products SET colors = 'Black,White,Pink' WHERE colors IS NULL OR colors = ''")
    conn.execute("UPDATE products SET active = 1                  WHERE active IS NULL")
    conn.execute("UPDATE orders   SET status = 'Pending'          WHERE status IS NULL")

    # Seed default products if table is empty
    count = conn.execute('SELECT COUNT(*) FROM products').fetchone()[0]
    if count == 0:
        dress_imgs = json.dumps({
            "Black": [
                "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1581044777550-4cfa9e5f8b06?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=800&fit=crop"
            ],
            "White": [
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop"
            ],
            "Pink": [
                "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&fit=crop",
                "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&fit=crop"
            ]
        })
        gown_imgs = json.dumps({
            "Black": [
                "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop",
                "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&fit=crop"
            ],
            "White": [
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&fit=crop",
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&fit=crop"
            ],
            "Red": [
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop"
            ]
        })
        boho_imgs = json.dumps({
            "Black": [
                "https://images.unsplash.com/photo-1581044777550-4cfa9e5f8b06?w=800&fit=crop",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop"
            ],
            "Beige": [
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
                "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop"
            ],
            "Pink": [
                "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&fit=crop",
                "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&fit=crop"
            ]
        })
        seed = [
            ("Floral Summer Dress",  1999, "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop",
             "Women", "S,M,L", "Black,White,Pink", dress_imgs, 35),
            ("Elegant Evening Gown", 3499, "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&fit=crop",
             "Women", "XS,S,M,L", "Black,White,Red", gown_imgs, 18),
            ("Boho Casual Set",      2199, "https://images.unsplash.com/photo-1581044777550-4cfa9e5f8b06?w=800&fit=crop",
             "Women", "XS,S,M,L,XL", "Black,Beige,Pink", boho_imgs, 7),
            ("Men Casual Shirt",     1299, "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7",
             "Men", "S,M,L,XL", "White,Blue,Black", None, 0),
            ("Leather Handbag",      2499, "https://images.unsplash.com/photo-1584917865442-de89df76afd3",
             "Accessories", "One Size", "Black,Brown,Tan", None, 3),
        ]
        conn.executemany(
            "INSERT INTO products (name, price, image, category, sizes, colors, images, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            seed
        )

    # Seed kurthi products if not already present
    kurthi_count = conn.execute("SELECT COUNT(*) FROM products WHERE category='Kurthi'").fetchone()[0]
    if kurthi_count == 0:
        k1_imgs = json.dumps({
            "Blue": [
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop",
                "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&fit=crop"
            ],
            "Pink": [
                "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&fit=crop",
                "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&fit=crop"
            ],
            "Yellow": [
                "https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
                "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop"
            ]
        })
        k2_imgs = json.dumps({
            "Red": [
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop"
            ],
            "Green": [
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop"
            ],
            "Purple": [
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1581044777550-4cfa9e5f8b06?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=800&fit=crop"
            ]
        })
        k3_imgs = json.dumps({
            "Black": [
                "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1581044777550-4cfa9e5f8b06?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=800&fit=crop"
            ],
            "White": [
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop"
            ],
            "Navy": [
                "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop",
                "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&fit=crop"
            ]
        })
        k4_imgs = json.dumps({
            "Beige": [
                "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop"
            ],
            "Maroon": [
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop",
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop"
            ],
            "Orange": [
                "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&fit=crop",
                "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&fit=crop"
            ]
        })
        k5_imgs = json.dumps({
            "Pink": [
                "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1514995428455-447d4443fa7f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&fit=crop"
            ],
            "Blue": [
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop",
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop",
                "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&fit=crop"
            ],
            "Green": [
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop"
            ]
        })
        kurthi_seed = [
            ("Cotton Printed Kurti", 899,
             "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL", "Blue,Pink,Yellow", k1_imgs, 40),
            ("Anarkali Kurti", 1499,
             "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
             "Kurthi", "S,M,L,XL", "Red,Green,Purple", k2_imgs, 25),
            ("Straight Fit Kurti", 1199,
             "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL,XXL", "Black,White,Navy", k3_imgs, 30),
            ("Embroidered Kurti", 1899,
             "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop",
             "Kurthi", "S,M,L,XL", "Beige,Maroon,Orange", k4_imgs, 15),
            ("Floral Block Print Kurti", 999,
             "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL", "Pink,Blue,Green", k5_imgs, 50),
        ]
        conn.executemany(
            "INSERT INTO products (name, price, image, category, sizes, colors, images, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            kurthi_seed
        )

    # Seed Churidhar products
    churidhar_count = conn.execute("SELECT COUNT(*) FROM products WHERE name LIKE '%Churidhar%' OR name LIKE '%churidhar%'").fetchone()[0]
    if churidhar_count == 0:
        ch1_imgs = json.dumps({
            "Blue": [
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop",
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop"
            ],
            "Pink": [
                "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&fit=crop",
                "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&fit=crop"
            ]
        })
        ch2_imgs = json.dumps({
            "Green": [
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop"
            ],
            "Maroon": [
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop",
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop"
            ]
        })
        ch3_imgs = json.dumps({
            "Red": [
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&fit=crop"
            ],
            "Yellow": [
                "https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&fit=crop",
                "https://images.unsplash.com/photo-1514995428455-447d4443fa7f?w=800&fit=crop"
            ]
        })
        ch4_imgs = json.dumps({
            "Purple": [
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=800&fit=crop",
                "https://images.unsplash.com/photo-1581044777550-4cfa9e5f8b06?w=800&fit=crop"
            ],
            "Navy": [
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop",
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop",
                "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&fit=crop"
            ]
        })
        churidhar_seed = [
            ("Cotton Churidhar Set", 1199,
             "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop",
             "Kurthi", "S,M,L,XL", "Blue,Pink", ch1_imgs, 35),
            ("Embroidered Churidhar", 1599,
             "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL", "Green,Maroon", ch2_imgs, 20),
            ("Silk Churidhar", 2199,
             "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
             "Kurthi", "S,M,L", "Red,Yellow", ch3_imgs, 15),
            ("Block Print Churidhar", 1399,
             "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL,XXL", "Purple,Navy", ch4_imgs, 28),
        ]
        conn.executemany(
            "INSERT INTO products (name, price, image, category, sizes, colors, images, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            churidhar_seed
        )

    # Seed Formal products
    formal_count = conn.execute("SELECT COUNT(*) FROM products WHERE name LIKE '%Formal%' OR name LIKE '%formal%'").fetchone()[0]
    if formal_count == 0:
        f1_imgs = json.dumps({
            "Black": [
                "https://images.unsplash.com/photo-1589465885857-44edb59bbff2?w=800&fit=crop",
                "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&fit=crop"
            ],
            "Navy": [
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop",
                "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&fit=crop",
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop"
            ]
        })
        f2_imgs = json.dumps({
            "White": [
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop"
            ],
            "Cream": [
                "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop",
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop"
            ]
        })
        f3_imgs = json.dumps({
            "Maroon": [
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&fit=crop"
            ],
            "Olive": [
                "https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop"
            ]
        })
        f4_imgs = json.dumps({
            "Grey": [
                "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop"
            ],
            "Black": [
                "https://images.unsplash.com/photo-1589465885857-44edb59bbff2?w=800&fit=crop",
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=800&fit=crop"
            ]
        })
        formal_seed = [
            ("Formal Straight Kurti", 1799,
             "https://images.unsplash.com/photo-1589465885857-44edb59bbff2?w=800&fit=crop",
             "Kurthi", "S,M,L,XL", "Black,Navy", f1_imgs, 22),
            ("Formal Office Kurta", 1599,
             "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL", "White,Cream", f2_imgs, 30),
            ("Formal Embroidered Set", 2499,
             "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
             "Kurthi", "S,M,L", "Maroon,Olive", f3_imgs, 12),
            ("Formal Palazzo Suit", 2199,
             "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL,XXL", "Grey,Black", f4_imgs, 18),
        ]
        conn.executemany(
            "INSERT INTO products (name, price, image, category, sizes, colors, images, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            formal_seed
        )

    # Seed Anarkali products
    anarkali_count = conn.execute("SELECT COUNT(*) FROM products WHERE name LIKE '%Anarkali%' AND name NOT LIKE '%Kurti%'").fetchone()[0]
    if anarkali_count == 0:
        a1_imgs = json.dumps({
            "Red": [
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&fit=crop"
            ],
            "Pink": [
                "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&fit=crop",
                "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&fit=crop"
            ],
            "Blue": [
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop",
                "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&fit=crop"
            ]
        })
        a2_imgs = json.dumps({
            "Green": [
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop"
            ],
            "Purple": [
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=800&fit=crop",
                "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&fit=crop"
            ],
            "Yellow": [
                "https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
                "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&fit=crop"
            ]
        })
        a3_imgs = json.dumps({
            "Maroon": [
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop",
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop"
            ],
            "Black": [
                "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=800&fit=crop",
                "https://images.unsplash.com/photo-1589465885857-44edb59bbff2?w=800&fit=crop"
            ]
        })
        a4_imgs = json.dumps({
            "Orange": [
                "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop",
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop"
            ],
            "Navy": [
                "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop",
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop"
            ]
        })
        a5_imgs = json.dumps({
            "Gold": [
                "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&fit=crop",
                "https://images.unsplash.com/photo-1603217192634-61068e4d4bf9?w=800&fit=crop",
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop"
            ],
            "Red": [
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop"
            ]
        })
        anarkali_seed = [
            ("Flared Anarkali Suit", 1899,
             "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
             "Kurthi", "S,M,L,XL", "Red,Pink,Blue", a1_imgs, 30,
             "An exquisitely flared Anarkali suit that radiates grace and elegance. Crafted from premium fabric with intricate detailing, this piece features a floor-sweeping flare that moves beautifully with every step. Perfect for festivals, weddings, and special occasions."),
            ("Embroidered Anarkali Set", 2299,
             "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL", "Green,Purple,Yellow", a2_imgs, 20,
             "A stunning embroidered Anarkali set adorned with delicate threadwork and mirror embellishments. The rich fabric and intricate embroidery make this a showstopper at any festive gathering. Comes complete with matching dupatta and churidar."),
            ("Silk Anarkali Suit", 3199,
             "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
             "Kurthi", "S,M,L", "Maroon,Black", a3_imgs, 15,
             "Luxurious silk Anarkali suit that blends tradition with contemporary fashion. The lustrous silk fabric drapes elegantly, complemented by rich embroidery along the hem and neckline. An ideal choice for weddings and formal celebrations."),
            ("Layered Anarkali Dress", 1699,
             "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL,XXL", "Orange,Navy", a4_imgs, 25,
             "A contemporary layered Anarkali dress that blends Indo-Western charm with classic elegance. Multiple tiered layers create a stunning silhouette with excellent movement. Versatile enough for both festive occasions and evening parties."),
            ("Bridal Anarkali Lehenga", 4999,
             "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&fit=crop",
             "Kurthi", "XS,S,M,L,XL", "Gold,Red", a5_imgs, 8,
             "A breathtaking bridal Anarkali lehenga fit for royalty. Heavy zari embroidery and stone embellishments make this an unforgettable bridal or sangeet outfit. The rich fabric and traditional craftsmanship embody the finest in Indian bridal fashion."),
        ]
        conn.executemany(
            "INSERT INTO products (name, price, image, category, sizes, colors, images, stock, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            anarkali_seed
        )

    # Seed Crop Top products
    croptop_count = conn.execute("SELECT COUNT(*) FROM products WHERE name LIKE '%Crop%' OR name LIKE '%crop%'").fetchone()[0]
    if croptop_count == 0:
        c1_imgs = json.dumps({
            "Pink": [
                "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=800&fit=crop",
                "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1514995428455-447d4443fa7f?w=800&fit=crop"
            ],
            "White": [
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop"
            ]
        })
        c2_imgs = json.dumps({
            "Yellow": [
                "https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=800&fit=crop",
                "https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&fit=crop"
            ],
            "Orange": [
                "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&fit=crop",
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&fit=crop"
            ]
        })
        c3_imgs = json.dumps({
            "Black": [
                "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=800&fit=crop",
                "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&fit=crop",
                "https://images.unsplash.com/photo-1589465885857-44edb59bbff2?w=800&fit=crop"
            ],
            "Red": [
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&fit=crop",
                "https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=800&fit=crop",
                "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&fit=crop"
            ]
        })
        c4_imgs = json.dumps({
            "Blue": [
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop",
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&fit=crop",
                "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&fit=crop"
            ],
            "Green": [
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&fit=crop",
                "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&fit=crop",
                "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&fit=crop"
            ]
        })
        croptop_seed = [
            ("Floral Crop Top", 799,
             "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=800&fit=crop",
             "Women", "XS,S,M,L", "Pink,White", c1_imgs, 45),
            ("Tie-Dye Crop Top", 899,
             "https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=800&fit=crop",
             "Women", "XS,S,M,L,XL", "Yellow,Orange", c2_imgs, 38),
            ("Minimal Crop Top", 699,
             "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=800&fit=crop",
             "Women", "XS,S,M,L,XL", "Black,Red", c3_imgs, 55),
            ("Embroidered Crop Top", 1099,
             "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&fit=crop",
             "Women", "XS,S,M,L", "Blue,Green", c4_imgs, 30),
        ]
        conn.executemany(
            "INSERT INTO products (name, price, image, category, sizes, colors, images, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            croptop_seed
        )

    # Add descriptions to products that are missing them
    desc_map = {
        'Cotton Printed Kurti': 'A vibrant cotton printed kurti that effortlessly blends comfort with ethnic style. The breathable cotton fabric keeps you cool throughout the day, while the bold prints make a confident statement. Perfect for casual outings, college wear, and everyday festive occasions.',
        'Anarkali Kurti': 'A graceful Anarkali-style kurti that combines the timeless charm of traditional silhouettes with contemporary styling. The flowing fabric and elegant flare create a silhouette that is both flattering and comfortable, making it perfect for festive and semi-formal occasions.',
        'Straight Fit Kurti': 'A versatile straight-fit kurti that forms the cornerstone of any ethnic wardrobe. Clean lines and a tailored silhouette make this piece suitable for both office wear and casual settings. Pair with leggings, palazzos, or churidar for a polished look.',
        'Embroidered Kurti': 'An exquisitely embroidered kurti featuring intricate threadwork that celebrates the rich heritage of Indian craftsmanship. Every stitch reflects skilled artisanship, making this piece a standout at festivals, family gatherings, and celebrations.',
        'Floral Block Print Kurti': 'A charming floral block print kurti inspired by traditional Indian textile art. Hand-block printing techniques lend each piece a unique character, with vibrant patterns that celebrate India\u2019s rich printing heritage. A must-have for those who appreciate artisanal fashion.',
        'Cotton Churidhar Set': 'A classic cotton churidhar set that combines elegance with everyday comfort. The breathable cotton fabric is ideal for all-day wear, while the set\u2019s clean tailoring makes it suitable for both casual and semi-formal occasions. Comes with matching dupatta.',
        'Embroidered Churidhar': 'A beautifully embroidered churidhar set featuring delicate floral embroidery along the neckline and cuffs. The premium fabric drapes gracefully, and the included dupatta adds a traditional finishing touch. Perfect for festive gatherings and celebrations.',
        'Silk Churidhar': 'A luxurious silk churidhar set that exudes sophistication and grace. The rich silk fabric shimmers beautifully under light, making it an ideal choice for weddings and formal occasions. The ensemble comes with a carefully matched dupatta for a complete look.',
        'Block Print Churidhar': 'A stunning block print churidhar set featuring traditional motifs printed with natural dyes. The artisanal block printing technique ensures each piece has a unique quality, celebrating India\u2019s rich textile heritage. Comes with coordinating dupatta.',
        'Formal Straight Kurti': 'A refined formal straight kurti designed for the professional woman who values elegance at work. The streamlined silhouette and subtle detailing ensure a polished look in any professional setting. Pairs perfectly with tailored trousers or classic churidar.',
        'Formal Office Kurta': 'A sophisticated formal office kurta crafted for the modern professional. The crisp fabric maintains its shape throughout the day, while the minimalist design ensures versatility across all professional environments. An essential wardrobe staple for working women.',
        'Formal Embroidered Set': 'A refined formal embroidered set that strikes the perfect balance between tradition and professional elegance. Subtle embroidery along the hem and neckline adds a touch of sophistication without overpowering the formal aesthetic. Includes matching dupatta.',
        'Formal Palazzo Suit': 'A chic formal palazzo suit that redefines contemporary office wear. Wide-leg palazzos paired with a tailored kurti create a modern silhouette that is both stylish and comfortable. Ideal for corporate settings, client meetings, and formal events.',
        'Floral Crop Top': 'A delightful floral crop top that brings a burst of freshness to your wardrobe. Light, breezy fabric with charming floral patterns makes this piece perfect for summer outings, brunches, and casual hangouts. Style with high-waisted jeans or skirts for a trendy look.',
        'Tie-Dye Crop Top': 'A trendy tie-dye crop top that captures the spirit of boho-chic fashion. Each piece features unique dye patterns, making it a one-of-a-kind addition to your wardrobe. Pair with wide-leg pants or denim shorts for an effortlessly cool summer look.',
        'Minimal Crop Top': 'A sleek minimal crop top designed for the modern woman who appreciates clean aesthetics. The versatile design pairs seamlessly with almost anything in your wardrobe \u2014 from high-waisted skirts to tailored trousers. A timeless wardrobe essential.',
        'Embroidered Crop Top': 'A feminine embroidered crop top that adds a touch of artisanal charm to casual wear. Delicate embroidery details elevate this piece from a simple top to a statement garment. Perfect for festive gatherings, date nights, or casual occasions where you want to stand out.',
        'Floral Summer Dress': 'A breezy floral summer dress that captures the essence of warm-weather dressing. Crafted from lightweight fabric with a flattering cut, this dress moves beautifully and keeps you cool. The vibrant floral print adds a playful touch that is perfect for beach days, picnics, and garden parties.',
        'Elegant Evening Gown': 'A breathtaking evening gown that transforms every entrance into a memorable moment. The floor-length silhouette, premium fabric, and sophisticated cut combine to create an outfit worthy of the most special occasions. Whether for a gala, a wedding, or a formal dinner, this gown ensures you leave an unforgettable impression.',
        'Boho Casual Set': 'A relaxed boho casual set that channels free-spirited style with effortless ease. Flowing fabric, earthy tones, and thoughtful detailing create a look that is simultaneously carefree and curated. Perfect for outdoor festivals, casual brunches, and everyday adventures.',
        'Men Casual Shirt': 'A versatile men\u2019s casual shirt that forms the backbone of a well-rounded wardrobe. Crafted from breathable fabric with clean finishing, this shirt transitions effortlessly from weekend casual to smart-casual office wear. A reliable everyday essential for the modern man.',
        'Leather Handbag': 'An impeccably crafted leather handbag that exemplifies timeless luxury. Premium full-grain leather, sturdy hardware, and a thoughtfully designed interior make this bag as practical as it is beautiful. A statement accessory that elevates every outfit, from casual to formal.',
    }
    for prod_name, prod_desc in desc_map.items():
        conn.execute(
            "UPDATE products SET description = ? WHERE name = ? AND (description IS NULL OR description = '')",
            (prod_desc, prod_name)
        )

    # Fix broken image URLs in existing records
    broken_photo = "photo-1581044777550-4cfa9e5f8b06"
    fixed_photo  = "photo-1512436991641-6745cdb1723f"
    broken_rows = conn.execute(
        "SELECT id, image, images FROM products WHERE image LIKE ? OR images LIKE ?",
        ('%' + broken_photo + '%', '%' + broken_photo + '%')
    ).fetchall()
    for row in broken_rows:
        new_image  = row['image'].replace(broken_photo, fixed_photo) if row['image'] else row['image']
        new_images = row['images'].replace(broken_photo, fixed_photo) if row['images'] else row['images']
        conn.execute(
            "UPDATE products SET image = ?, images = ? WHERE id = ?",
            (new_image, new_images, row['id'])
        )

    conn.commit()
    conn.close()


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def log_action(conn, action, entity, entity_id, username, detail=""):
    conn.execute(
        "INSERT INTO audit_log (action, entity, entity_id, username, detail) VALUES (?, ?, ?, ?, ?)",
        (action, entity, entity_id, username, detail)
    )


init_db()


# ===========================
# PAGE ROUTES
# ===========================
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/contact")
def contact_page():
    return render_template("contact.html")

@app.route("/information")
def information_page():
    return render_template("information.html")

@app.route("/cart")
def cart():
    return render_template("cart.html")

@app.route("/wishlist")
def wishlist():
    return render_template("wishlist.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/admin")
def admin_page():
    return render_template("admin.html")

@app.route("/product")
def product_page():
    return render_template("product.html")

@app.route("/checkout")
def checkout_page():
    return render_template("checkout.html")

@app.route("/shop")
def shop_page():
    return render_template("shop.html")


# ===========================
# HELPERS
# ===========================
def require_admin():
    role = request.headers.get("X-User-Role", "")
    if role != "admin":
        return False
    return True

def get_actor():
    return request.headers.get("X-Username", "admin")


# ===========================
# API — STATUS
# ===========================
@app.route("/api/status")
def status():
    return jsonify({"status": "ok", "brand": "ATELIER"})


# ===========================
# API — PRODUCTS
# ===========================
@app.route("/api/products", methods=["GET"])
def get_products():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, price, image, category, sizes, colors, images, video, stock, description, active, code "
        "FROM products ORDER BY id DESC"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        if d.get("images"):
            try:
                d["images"] = json.loads(d["images"])
            except Exception:
                pass
        result.append(d)
    return jsonify(result)


@app.route("/api/products", methods=["POST"])
def add_product():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    data        = request.get_json()
    name        = (data.get("name")        or "").strip()
    price       =  data.get("price")
    image       = (data.get("image")       or "").strip()
    category    = (data.get("category")    or "Women").strip()
    sizes       = (data.get("sizes")       or "S,M,L,XL").strip()
    colors      = (data.get("colors")      or "Black,White,Pink").strip()
    images      =  data.get("images")      or None
    video       = (data.get("video")       or None)
    stock       =  data.get("stock")
    description = (data.get("description") or "").strip() or None
    code        = (data.get("code")        or "").strip() or None

    if not name or not price or not image:
        return jsonify({"error": "name, price, and image are required"}), 400

    try:
        price = int(price)
    except (TypeError, ValueError):
        return jsonify({"error": "price must be a number"}), 400

    try:
        stock = int(stock) if stock is not None and stock != "" else -1
    except (TypeError, ValueError):
        stock = -1

    images_str = json.dumps(images) if isinstance(images, dict) else images

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO products (name, price, image, category, sizes, colors, images, video, stock, description, active, code) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
        (name, price, image, category, sizes, colors, images_str, video, stock, description, code)
    )
    conn.commit()
    new_id = cur.lastrowid
    log_action(conn, "create", "product", new_id, get_actor(), f"Added product: {name}")
    conn.commit()
    conn.close()

    return jsonify({"message": "Product added", "product": {"id": new_id, "name": name, "price": price,
                    "image": image, "category": category, "sizes": sizes, "colors": colors}}), 201


@app.route("/api/products/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    data        = request.get_json()
    name        = (data.get("name")        or "").strip()
    price       =  data.get("price")
    image       = (data.get("image")       or "").strip()
    category    = (data.get("category")    or "Women").strip()
    sizes       = (data.get("sizes")       or "S,M,L,XL").strip()
    colors      = (data.get("colors")      or "Black,White,Pink").strip()
    images      =  data.get("images")      or None
    video       = (data.get("video")       or None)
    stock       =  data.get("stock")
    description = (data.get("description") or "").strip() or None
    code        = (data.get("code")        or "").strip() or None

    if not name or not price or not image:
        return jsonify({"error": "name, price, and image are required"}), 400

    try:
        price = int(price)
    except (TypeError, ValueError):
        return jsonify({"error": "price must be a number"}), 400

    try:
        stock = int(stock) if stock is not None and stock != "" else -1
    except (TypeError, ValueError):
        stock = -1

    images_str = json.dumps(images) if isinstance(images, dict) else images

    conn = get_db()
    conn.execute(
        "UPDATE products SET name=?, price=?, image=?, category=?, sizes=?, colors=?, images=?, video=?, stock=?, description=?, code=? WHERE id=?",
        (name, price, image, category, sizes, colors, images_str, video, stock, description, code, product_id)
    )
    log_action(conn, "update", "product", product_id, get_actor(), f"Updated product: {name}")
    conn.commit()
    conn.close()

    return jsonify({"message": "Product updated", "product": {"id": product_id, "name": name, "price": price,
                    "image": image, "category": category, "sizes": sizes, "colors": colors}}), 200


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()
    row = conn.execute("SELECT name FROM products WHERE id=?", (product_id,)).fetchone()
    name = row["name"] if row else str(product_id)
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    log_action(conn, "delete", "product", product_id, get_actor(), f"Deleted product: {name}")
    conn.commit()
    conn.close()
    return jsonify({"message": "Product deleted"}), 200


@app.route("/api/products/bulk-status", methods=["POST"])
def bulk_product_status():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    data   = request.get_json()
    ids    = data.get("ids", [])
    active = 1 if data.get("active") else 0
    label  = "activated" if active else "deactivated"

    if not ids:
        return jsonify({"error": "No product ids provided"}), 400

    conn = get_db()
    placeholders = ",".join("?" * len(ids))
    conn.execute(f"UPDATE products SET active=? WHERE id IN ({placeholders})", [active] + ids)
    log_action(conn, "bulk_status", "product", None, get_actor(),
               f"Bulk {label} product IDs: {ids}")
    conn.commit()
    conn.close()
    return jsonify({"message": f"Products {label}"}), 200


@app.route("/api/products/export", methods=["GET"])
def export_products():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, code, price, category, sizes, colors, stock, active, description FROM products ORDER BY id"
    ).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "name", "code", "price", "category", "sizes", "colors", "stock", "active", "description"])
    for r in rows:
        writer.writerow([r["id"], r["name"], r["code"] or "", r["price"], r["category"],
                         r["sizes"], r["colors"], r["stock"], r["active"], r["description"] or ""])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=products.csv"}
    )


@app.route("/api/products/import", methods=["POST"])
def import_products():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    content = file.read().decode("utf-8", errors="replace")
    reader  = csv.DictReader(io.StringIO(content))
    added   = 0
    errors  = []

    conn = get_db()
    for i, row in enumerate(reader, start=2):
        name  = (row.get("name") or "").strip()
        price = row.get("price", "").strip()
        image = (row.get("image") or row.get("image_url") or "").strip()
        category = (row.get("category") or "Women").strip()
        sizes    = (row.get("sizes")    or "S,M,L,XL").strip()
        colors   = (row.get("colors")   or "Black,White,Pink").strip()
        stock    = row.get("stock", "-1").strip()
        code     = (row.get("code")    or "").strip() or None
        description = (row.get("description") or "").strip() or None

        if not name or not price:
            errors.append(f"Row {i}: missing name or price")
            continue

        try:
            price = int(float(price))
        except (ValueError, TypeError):
            errors.append(f"Row {i}: invalid price '{price}'")
            continue

        if not image:
            image = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&fit=crop"

        try:
            stock = int(stock)
        except (ValueError, TypeError):
            stock = -1

        conn.execute(
            "INSERT INTO products (name, price, image, category, sizes, colors, stock, code, description, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
            (name, price, image, category, sizes, colors, stock, code, description)
        )
        added += 1

    log_action(conn, "import", "product", None, get_actor(), f"Imported {added} products via CSV")
    conn.commit()
    conn.close()

    return jsonify({"message": f"Imported {added} products", "errors": errors}), 200


# ===========================
# API — ORDERS
# ===========================
@app.route("/api/orders", methods=["POST"])
def place_order():
    data          = request.get_json()
    items         = data.get("items")
    total         = data.get("total")
    username      = (data.get("username")      or "guest").strip()
    customer_name = (data.get("customer_name") or "").strip()
    phone         = (data.get("phone")         or "").strip()
    address       = (data.get("address")       or "").strip()
    payment_method = (data.get("payment_method") or "COD").strip()

    if not items or total is None:
        return jsonify({"error": "items and total are required"}), 400
    if not customer_name or not phone or not address:
        return jsonify({"error": "customer_name, phone, and address are required"}), 400

    try:
        total = int(total)
    except (TypeError, ValueError):
        return jsonify({"error": "total must be a number"}), 400

    items_json = json.dumps(items)

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO orders (items, total, username, customer_name, phone, address, status, payment_method) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)",
        (items_json, total, username, customer_name, phone, address, payment_method)
    )
    conn.commit()
    order_id = cur.lastrowid
    log_action(conn, "create", "order", order_id, username, f"Order placed for ₹{total}")
    conn.commit()
    conn.close()

    return jsonify({"message": "Order placed", "order_id": order_id}), 201


@app.route("/api/orders", methods=["GET"])
def get_orders():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    status_filter = request.args.get("status", "")
    date_from     = request.args.get("date_from", "")
    date_to       = request.args.get("date_to", "")
    page          = max(1, int(request.args.get("page", 1)))
    per_page      = int(request.args.get("per_page", 20))

    where_clauses = []
    params        = []

    if status_filter:
        where_clauses.append("status = ?")
        params.append(status_filter)
    if date_from:
        where_clauses.append("DATE(created_at) >= ?")
        params.append(date_from)
    if date_to:
        where_clauses.append("DATE(created_at) <= ?")
        params.append(date_to)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    conn = get_db()
    total_count = conn.execute(f"SELECT COUNT(*) FROM orders {where_sql}", params).fetchone()[0]

    offset = (page - 1) * per_page
    rows   = conn.execute(
        f"SELECT id, items, total, username, customer_name, phone, address, created_at, status, notes, payment_method "
        f"FROM orders {where_sql} ORDER BY id DESC LIMIT ? OFFSET ?",
        params + [per_page, offset]
    ).fetchall()
    conn.close()

    orders = []
    for r in rows:
        o = dict(r)
        try:
            o["items"] = json.loads(o["items"])
        except Exception:
            o["items"] = []
        orders.append(o)

    return jsonify({"orders": orders, "total": total_count, "page": page, "per_page": per_page})


@app.route("/api/orders/<int:order_id>/status", methods=["PUT"])
def update_order_status(order_id):
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    data   = request.get_json()
    status = (data.get("status") or "").strip()
    allowed = {"Pending", "Paid", "Shipped", "Delivered", "Cancelled"}
    if status not in allowed:
        return jsonify({"error": f"status must be one of {allowed}"}), 400

    conn = get_db()
    conn.execute("UPDATE orders SET status=? WHERE id=?", (status, order_id))
    log_action(conn, "status_change", "order", order_id, get_actor(), f"Status changed to {status}")
    conn.commit()
    conn.close()
    return jsonify({"message": "Order status updated"}), 200


@app.route("/api/orders/<int:order_id>/notes", methods=["PUT"])
def update_order_notes(order_id):
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    data  = request.get_json()
    notes = (data.get("notes") or "").strip()

    conn = get_db()
    conn.execute("UPDATE orders SET notes=? WHERE id=?", (notes, order_id))
    log_action(conn, "notes_update", "order", order_id, get_actor(), "Notes updated")
    conn.commit()
    conn.close()
    return jsonify({"message": "Notes updated"}), 200


@app.route("/api/orders/export", methods=["GET"])
def export_orders():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()
    rows = conn.execute(
        "SELECT id, username, customer_name, phone, address, total, status, payment_method, created_at FROM orders ORDER BY id DESC"
    ).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "username", "customer_name", "phone", "address", "total", "status", "payment_method", "created_at"])
    for r in rows:
        writer.writerow([r["id"], r["username"], r["customer_name"], r["phone"],
                         r["address"], r["total"], r["status"], r["payment_method"], r["created_at"]])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"}
    )


# ===========================
# API — USERS
# ===========================
@app.route("/api/users", methods=["GET"])
def get_users():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    search  = request.args.get("search", "").strip()
    role_f  = request.args.get("role", "").strip()
    page    = max(1, int(request.args.get("page", 1)))
    per_page = int(request.args.get("per_page", 20))

    where_clauses = []
    params        = []

    if search:
        where_clauses.append("(username LIKE ? OR email LIKE ?)")
        params += [f"%{search}%", f"%{search}%"]
    if role_f:
        where_clauses.append("role = ?")
        params.append(role_f)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    conn = get_db()
    total_count = conn.execute(f"SELECT COUNT(*) FROM users {where_sql}", params).fetchone()[0]
    offset = (page - 1) * per_page
    rows = conn.execute(
        f"SELECT id, username, email, phone, role, full_name, disabled, created_at FROM users {where_sql} ORDER BY id DESC LIMIT ? OFFSET ?",
        params + [per_page, offset]
    ).fetchall()

    # Get order stats per user
    users = []
    for r in rows:
        u = dict(r)
        stats = conn.execute(
            "SELECT COUNT(*) as order_count, COALESCE(SUM(total),0) as total_spent FROM orders WHERE username=?",
            (u["username"],)
        ).fetchone()
        u["order_count"]  = stats["order_count"]
        u["total_spent"]  = stats["total_spent"]
        users.append(u)

    conn.close()
    return jsonify({"users": users, "total": total_count, "page": page, "per_page": per_page})


@app.route("/api/users/<int:user_id>/role", methods=["PUT"])
def update_user_role(user_id):
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    role = (data.get("role") or "").strip()
    if role not in ("user", "admin"):
        return jsonify({"error": "role must be 'user' or 'admin'"}), 400

    conn = get_db()
    row = conn.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    conn.execute("UPDATE users SET role=? WHERE id=?", (role, user_id))
    log_action(conn, "role_change", "user", user_id, get_actor(), f"Role changed to {role} for {row['username']}")
    conn.commit()
    conn.close()
    return jsonify({"message": "Role updated"}), 200


@app.route("/api/users/<int:user_id>/status", methods=["PUT"])
def update_user_status(user_id):
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    data     = request.get_json()
    disabled = 1 if data.get("disabled") else 0

    conn = get_db()
    row = conn.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    conn.execute("UPDATE users SET disabled=? WHERE id=?", (disabled, user_id))
    label = "disabled" if disabled else "enabled"
    log_action(conn, "account_status", "user", user_id, get_actor(), f"Account {label} for {row['username']}")
    conn.commit()
    conn.close()
    return jsonify({"message": f"User {label}"}), 200


@app.route("/api/users/<int:user_id>/sessions", methods=["DELETE"])
def revoke_user_sessions(user_id):
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()
    row = conn.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    log_action(conn, "session_revoke", "user", user_id, get_actor(), f"Sessions revoked for {row['username']}")
    conn.commit()
    conn.close()
    return jsonify({"message": "Sessions revoked"}), 200


# ===========================
# API — STATS & CHARTS
# ===========================
@app.route("/api/stats")
def stats():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()
    product_count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    user_count    = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]

    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    orders_30d  = conn.execute(
        "SELECT COUNT(*) FROM orders WHERE DATE(created_at) >= ?", (thirty_days_ago,)
    ).fetchone()[0]
    revenue_30d = conn.execute(
        "SELECT COALESCE(SUM(total),0) FROM orders WHERE DATE(created_at) >= ?", (thirty_days_ago,)
    ).fetchone()[0]
    pending_orders = conn.execute(
        "SELECT COUNT(*) FROM orders WHERE status='Pending'"
    ).fetchone()[0]
    low_stock = conn.execute(
        "SELECT COUNT(*) FROM products WHERE stock >= 0 AND stock <= 10"
    ).fetchone()[0]

    conn.close()
    return jsonify({
        "products":      product_count,
        "users":         user_count,
        "orders_30d":    orders_30d,
        "revenue_30d":   revenue_30d,
        "pending_orders": pending_orders,
        "low_stock":     low_stock,
    })


@app.route("/api/admin/chart/sales")
def chart_sales():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    conn  = get_db()
    today = datetime.utcnow().date()
    days  = [(today - timedelta(days=i)) for i in range(29, -1, -1)]

    result = []
    for day in days:
        day_str = day.strftime("%Y-%m-%d")
        row = conn.execute(
            "SELECT COALESCE(SUM(total),0) as rev, COUNT(*) as cnt FROM orders WHERE DATE(created_at)=?",
            (day_str,)
        ).fetchone()
        result.append({"date": day_str, "revenue": row["rev"], "orders": row["cnt"]})

    conn.close()
    return jsonify(result)


@app.route("/api/admin/chart/orders-by-status")
def chart_orders_by_status():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()
    rows = conn.execute(
        "SELECT status, COUNT(*) as count FROM orders GROUP BY status"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/admin/chart/top-products")
def chart_top_products():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    conn  = get_db()
    orders_rows = conn.execute("SELECT items FROM orders").fetchall()
    conn.close()

    product_counts = {}
    for row in orders_rows:
        try:
            items = json.loads(row["items"])
            for item in items:
                pid   = str(item.get("id", ""))
                name  = item.get("name", f"Product {pid}")
                qty   = item.get("qty", item.get("quantity", 1))
                key   = (pid, name)
                product_counts[key] = product_counts.get(key, 0) + qty
        except Exception:
            continue

    sorted_products = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    result = [{"name": k[1], "count": v} for k, v in sorted_products]
    return jsonify(result)


@app.route("/api/admin/audit-log")
def admin_audit_log():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    limit = int(request.args.get("limit", 20))
    conn  = get_db()
    rows  = conn.execute(
        "SELECT id, action, entity, entity_id, username, detail, created_at FROM audit_log ORDER BY id DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ===========================
# API — INVENTORY
# ===========================
@app.route("/api/inventory")
def get_inventory():
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    threshold = int(request.args.get("threshold", 10))
    conn      = get_db()
    rows      = conn.execute(
        "SELECT id, name, code, category, stock, image FROM products WHERE stock >= 0 AND stock <= ? ORDER BY stock ASC",
        (threshold,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/inventory/<int:product_id>/stock", methods=["PUT"])
def adjust_stock(product_id):
    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 403

    data   = request.get_json()
    adjust = data.get("adjust", 0)

    try:
        adjust = int(adjust)
    except (TypeError, ValueError):
        return jsonify({"error": "adjust must be an integer"}), 400

    conn = get_db()
    row  = conn.execute("SELECT name, stock FROM products WHERE id=?", (product_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Product not found"}), 404

    new_stock = max(0, row["stock"] + adjust)
    conn.execute("UPDATE products SET stock=? WHERE id=?", (new_stock, product_id))
    log_action(conn, "stock_adjust", "product", product_id, get_actor(),
               f"Stock for '{row['name']}' adjusted by {adjust:+d} → {new_stock}")
    conn.commit()
    conn.close()
    return jsonify({"message": "Stock updated", "stock": new_stock}), 200


# ===========================
# PASSWORD RESET — HELPERS
# ===========================
def send_reset_email(to_email, reset_link):
    msg = EmailMessage()
    msg["Subject"] = "Atelier — Reset Your Password"
    msg["From"]    = "noreply@atelier.com"
    msg["To"]      = to_email
    msg.set_content(
        f"Hello,\n\n"
        f"We received a request to reset your Atelier password.\n\n"
        f"Click the link below to set a new password (valid for 30 minutes):\n"
        f"{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email.\n\n"
        f"— The Atelier Team"
    )
    msg.add_alternative(
        f"""<!DOCTYPE html><html><body style="font-family:Poppins,Arial,sans-serif;background:#f9f9f9;padding:40px;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
          <div style="text-align:center;margin-bottom:28px;">
            <span style="font-size:0.7rem;letter-spacing:0.35em;color:#c8a96e;font-weight:600;text-transform:uppercase;">ATELIER</span>
          </div>
          <h2 style="font-size:1.5rem;font-weight:600;color:#1a1a1a;margin-bottom:12px;">Reset Your Password</h2>
          <p style="color:#555;line-height:1.7;margin-bottom:28px;">
            We received a request to reset your password. Click the button below to set a new one.
            This link will expire in <strong>30 minutes</strong>.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="{reset_link}" style="background:#c8a96e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;display:inline-block;">Reset Password</a>
          </div>
          <p style="color:#999;font-size:0.82rem;">If you did not request this, you can safely ignore this email.</p>
        </div>
        </body></html>""",
        subtype="html"
    )
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


# ===========================
# PAGES — FORGOT / RESET
# ===========================
@app.route("/forgot-password")
def forgot_password_page():
    return render_template("forgot.html")


@app.route("/reset-password")
def reset_password_page():
    return render_template("reset-password.html")


# ===========================
# API — FORGOT PASSWORD
# ===========================
@app.route("/api/forgot-password", methods=["POST"])
def api_forgot_password():
    data  = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()

    if user:
        token      = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(minutes=30)
        conn.execute(
            "DELETE FROM password_resets WHERE email = ?", (email,)
        )
        conn.execute(
            "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
            (email, token, expires_at.strftime("%Y-%m-%d %H:%M:%S"))
        )
        conn.commit()

        base_url   = request.host_url.rstrip("/")
        reset_link = f"{base_url}/reset-password?token={token}"
        try:
            send_reset_email(email, reset_link)
        except Exception as e:
            conn.close()
            return jsonify({"error": f"Failed to send email: {str(e)}"}), 500

    conn.close()
    return jsonify({"message": "If an account with that email exists, a reset link has been sent."}), 200


# ===========================
# API — RESET PASSWORD
# ===========================
@app.route("/api/reset-password", methods=["POST"])
def api_reset_password():
    data         = request.get_json() or {}
    token        = (data.get("token")        or "").strip()
    new_password = (data.get("new_password") or "").strip()

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn  = get_db()
    reset = conn.execute(
        "SELECT * FROM password_resets WHERE token = ?", (token,)
    ).fetchone()

    if not reset:
        conn.close()
        return jsonify({"error": "Invalid or expired reset link"}), 400

    expires_at = datetime.strptime(reset["expires_at"], "%Y-%m-%d %H:%M:%S")
    if datetime.utcnow() > expires_at:
        conn.execute("DELETE FROM password_resets WHERE token = ?", (token,))
        conn.commit()
        conn.close()
        return jsonify({"error": "Reset link has expired. Please request a new one."}), 400

    hashed = hash_password(new_password)
    conn.execute(
        "UPDATE users SET password = ? WHERE LOWER(email) = ?",
        (hashed, reset["email"].lower())
    )
    conn.execute("DELETE FROM password_resets WHERE token = ?", (token,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Password updated successfully"}), 200


@app.route("/api/register", methods=["POST"])
def register():
    data      = request.get_json()
    full_name = (data.get("full_name") or "").strip()
    username  = full_name or (data.get("username") or "").strip()
    password  = (data.get("password") or "").strip()
    email     = (data.get("email")    or "").strip()
    phone     = (data.get("phone")    or "").strip()

    if not username or not password:
        return jsonify({"error": "Full name and password are required"}), 400

    hashed = hash_password(password)
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO users (username, password, role, full_name, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
            (username, hashed, "user", full_name or None, email or None, phone or None)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "An account with this name already exists"}), 409


@app.route("/api/login", methods=["POST"])
def login():
    data     = request.get_json()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    hashed = hash_password(password)
    conn   = get_db()
    user   = conn.execute(
        "SELECT * FROM users WHERE username = ? AND password = ?", (username, hashed)
    ).fetchone()
    conn.close()

    if user:
        return jsonify({"message": "success", "role": user["role"],
                        "username": user["username"]}), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401


# ===========================
# API — REVIEWS
# ===========================
@app.route("/api/reviews", methods=["GET"])
def get_reviews():
    product_id = request.args.get("product_id", type=int)
    if not product_id:
        return jsonify({"error": "product_id is required"}), 400
    conn = get_db()
    rows = conn.execute(
        "SELECT id, product_id, username, rating, comment, image_url, created_at FROM reviews WHERE product_id=? ORDER BY id DESC",
        (product_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/reviews", methods=["POST"])
def post_review():
    data       = request.get_json()
    product_id = data.get("product_id")
    username   = (data.get("username")  or "Anonymous").strip()
    rating     = data.get("rating", 5)
    comment    = (data.get("comment")   or "").strip()
    image_url  = (data.get("image_url") or "").strip() or None

    if not product_id:
        return jsonify({"error": "product_id is required"}), 400

    try:
        rating = max(1, min(5, int(rating)))
    except (TypeError, ValueError):
        rating = 5

    conn = get_db()
    cur  = conn.execute(
        "INSERT INTO reviews (product_id, username, rating, comment, image_url) VALUES (?, ?, ?, ?, ?)",
        (product_id, username, rating, comment or None, image_url)
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"message": "Review posted", "id": new_id}), 201


# ── Contact Messages ──────────────────────────────────────────────────────────

@app.route("/api/contact", methods=["POST"])
def submit_contact():
    data = request.get_json(silent=True) or {}
    name    = str(data.get("name", "")).strip()
    email   = str(data.get("email", "")).strip()
    subject = str(data.get("subject", "")).strip()
    message = str(data.get("message", "")).strip()
    if not name or not email or not message:
        return jsonify({"error": "Name, email, and message are required"}), 400
    conn = get_db()
    conn.execute(
        "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)",
        (name, email, subject or None, message)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Message received"}), 201


@app.route("/api/admin/messages", methods=["GET"])
def admin_get_messages():
    if not require_admin():
        return jsonify({"error": "Forbidden"}), 403
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, email, subject, message, read, created_at FROM contact_messages ORDER BY id DESC"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/admin/messages/<int:msg_id>/read", methods=["PATCH"])
def admin_mark_message_read(msg_id):
    if not require_admin():
        return jsonify({"error": "Forbidden"}), 403
    conn = get_db()
    conn.execute("UPDATE contact_messages SET read = 1 WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Marked as read"})


@app.route("/api/admin/messages/<int:msg_id>", methods=["DELETE"])
def admin_delete_message(msg_id):
    if not require_admin():
        return jsonify({"error": "Forbidden"}), 403
    conn = get_db()
    conn.execute("DELETE FROM contact_messages WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
