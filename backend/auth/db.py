import os
import sqlite3
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path

DB_FILE = Path(__file__).resolve().parent.parent / "finops_auth.db"

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_FILE))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            full_name TEXT NOT NULL,
            google_id TEXT UNIQUE,
            role TEXT NOT NULL DEFAULT 'USER',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            inputs TEXT NOT NULL,
            results TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

    # Ensure demo user exists
    demo_user = find_user_by_email("demo@finops.ai")
    if not demo_user:
        # Avoid circular import by importing hash_password inside or setting precomputed hash
        # bcrypt hash for 'Demo123!'
        demo_hash = "$2b$10$GE3ddneLmb4snBt.v9ghyOPUcWMsuxN3lnnEWYd7YHgTIghjkz6bO"
        create_user("FinOps Demo User", "demo@finops.ai", demo_hash, "USER")

def user_row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "email": row["email"],
        "passwordHash": row["password_hash"],
        "fullName": row["full_name"],
        "googleId": row["google_id"],
        "role": row["role"],
        "isActive": bool(row["is_active"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }

def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    return user_row_to_dict(row) if row else None

def find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return user_row_to_dict(row) if row else None

def create_user(full_name: str, email: str, password_hash: Optional[str] = None, role: str = "USER") -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    clean_email = email.lower().strip()
    clean_name = full_name.strip()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (id, email, password_hash, full_name, google_id, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, ?, 1, ?, ?)
    """, (user_id, clean_email, password_hash, clean_name, role, now, now))
    conn.commit()
    conn.close()

    return {
        "id": user_id,
        "email": clean_email,
        "passwordHash": password_hash,
        "fullName": clean_name,
        "role": role,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }

import json

def create_history_entry(user_id: str, entry_type: str, title: str, summary: str, inputs: Any, results: Any) -> Dict[str, Any]:
    history_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    inputs_str = json.dumps(inputs) if not isinstance(inputs, str) else inputs
    results_str = json.dumps(results) if not isinstance(results, str) else results

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO user_history (id, user_id, type, title, summary, inputs, results, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (history_id, user_id, entry_type, title, summary, inputs_str, results_str, now))
    conn.commit()
    conn.close()

    return {
        "id": history_id,
        "user_id": user_id,
        "type": entry_type,
        "title": title,
        "summary": summary,
        "inputs": inputs,
        "results": results,
        "created_at": now
    }

def get_user_history(user_id: str) -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_history WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()

    items = []
    for r in rows:
        try:
            inp = json.loads(r["inputs"])
        except Exception:
            inp = r["inputs"]
        try:
            res = json.loads(r["results"])
        except Exception:
            res = r["results"]
        items.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "type": r["type"],
            "title": r["title"],
            "summary": r["summary"],
            "inputs": inp,
            "results": res,
            "created_at": r["created_at"]
        })
    return items

def delete_history_entry(user_id: str, history_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_history WHERE id = ? AND user_id = ?", (history_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def clear_user_history(user_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_history WHERE user_id = ?", (user_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0
