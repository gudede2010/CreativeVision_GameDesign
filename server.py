"""Local Creative Vision prototype server with SQLite authentication."""
from pathlib import Path
import re
import secrets
import sqlite3
import json
from datetime import timedelta
from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.security import check_password_hash, generate_password_hash

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "creative_vision.sqlite3"
app = Flask(__name__, static_folder=str(ROOT), static_url_path="")
app.secret_key = secrets.token_hex(32)
app.permanent_session_lifetime = timedelta(days=30)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

def db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection

def init_db():
    with db() as connection:
        connection.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student')")
        admin_email = "admin@basischina.com"
        existing = connection.execute("SELECT id FROM users WHERE email = ?", (admin_email,)).fetchone()
        if not existing:
            connection.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')",
                (admin_email, generate_password_hash("creativevision_gd", method="pbkdf2:sha256", salt_length=16)),
            )

@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not re.fullmatch(r"[^@\s]+@basischina\.com", email):
        return jsonify(error="Use a valid @basischina.com email address."), 400
    if len(password) < 8:
        return jsonify(error="Password must be at least 8 characters."), 400
    try:
        with db() as connection:
            connection.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)))
    except sqlite3.IntegrityError:
        return jsonify(error="An account with this email already exists."), 409
    return jsonify(message="Account created."), 201

@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if email == "admin":
        email = "admin@basischina.com"
    with db() as connection:
        user = connection.execute("SELECT email, password_hash, role FROM users WHERE email = ?", (email,)).fetchone()
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify(error="Email or password is incorrect."), 401
    session["user_email"] = user["email"]
    session["demo_role"] = user["role"]
    session.permanent = True
    return jsonify(email=user["email"], role=user["role"])

@app.post("/api/password/change")
def change_password():
    if "user_email" not in session:
        return jsonify(error="Login required."), 401
    data = request.get_json(silent=True) or {}
    current_password = str(data.get("currentPassword", ""))
    password = str(data.get("password", ""))
    confirm = str(data.get("confirmPassword", ""))
    if len(password) < 8 or password != confirm:
        return jsonify(error="Passwords must match and be at least 8 characters."), 400
    with db() as connection:
        user = connection.execute("SELECT password_hash FROM users WHERE email = ?", (session["user_email"],)).fetchone()
        if not user or not check_password_hash(user["password_hash"], current_password):
            return jsonify(error="Current password is incorrect."), 401
        connection.execute("UPDATE users SET password_hash = ? WHERE email = ?", (generate_password_hash(password, method="pbkdf2:sha256", salt_length=16), session["user_email"]))
    return jsonify(message="Password changed.")

@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(message="Signed out.")

@app.post("/api/demo-login")
def demo_login():
    """Create a session for the UI-only Student/Leader/Admin prototype buttons."""
    role = str((request.get_json(silent=True) or {}).get("role", "student"))
    if role not in ("student", "leader", "admin"):
        return jsonify(error="Invalid demo role."), 400
    demo_email = {"student": "demo-student@basischina.com", "leader": "demo-leader@basischina.com", "admin": "admin@basischina.com"}[role]
    session["user_email"] = demo_email
    session["demo_role"] = role
    session.permanent = True
    return jsonify(role=role, email=demo_email)

@app.get("/api/session")
def current_session():
    email = session.get("user_email")
    if not email:
        return jsonify(authenticated=False)
    role = session.get("demo_role")
    if not role:
        with db() as connection:
            user = connection.execute("SELECT role FROM users WHERE email = ?", (email,)).fetchone()
        role = user["role"] if user else None
    if not role:
        session.clear()
        return jsonify(authenticated=False)
    return jsonify(authenticated=True, email=email, role=role)

@app.get("/api/dashboard")
def dashboard_data():
    return jsonify(json.loads((ROOT / "dashboard_data.json").read_text()))

@app.post("/api/dashboard")
def save_dashboard_data():
    if "user_email" not in session:
        return jsonify(error="Login required."), 401
    session_role = session.get("demo_role")
    if session_role in ("admin", "leader"):
        role = session_role
    else:
        with db() as connection:
            user = connection.execute("SELECT role FROM users WHERE email = ?", (session["user_email"],)).fetchone()
        role = user["role"] if user else None
    if role not in ("admin", "leader"):
        return jsonify(error="Leader or admin access required."), 403
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("weeks"), list):
        return jsonify(error="Invalid dashboard data."), 400
    (ROOT / "dashboard_data.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return jsonify(message="Dashboard saved.")

@app.get("/")
def home():
    return send_from_directory(ROOT, "index.html")

if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=8000, debug=True)
