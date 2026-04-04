from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
import numpy as np
import sqlite3
import json
import os
import hashlib
import io
import secrets
from datetime import datetime, timezone
from utils import preprocess

app = FastAPI()

# -------------------------------
# CORS (IMPORTANT)
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Load model
# -------------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "random_forest.pkl")
rf_model = joblib.load(MODEL_PATH)

# -------------------------------
# SQLite DB (Local Persistence)
# -------------------------------
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "app.db")


def _init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            source TEXT NOT NULL,
            allocated_amount REAL,
            spent_amount REAL,
            work_status TEXT,
            prediction TEXT,
            risk_score REAL,
            explanation TEXT,
            input_payload TEXT,
            review_status TEXT,
            user_id INTEGER,
            user_name TEXT,
            user_role TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    return conn


db_conn = _init_db()


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _ensure_column(table_name, column_def):
    col_name = column_def.split(" ")[0]
    cur = db_conn.execute(f"PRAGMA table_info({table_name})")
    cols = [row[1] for row in cur.fetchall()]
    if col_name not in cols:
        db_conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_def}")
        db_conn.commit()


_ensure_column("transactions", "user_id INTEGER")
_ensure_column("transactions", "user_name TEXT")
_ensure_column("transactions", "user_role TEXT")
_ensure_column("transactions", "review_status TEXT")


def _hash_password(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _ensure_default_users():
    cur = db_conn.execute("SELECT COUNT(*) FROM users")
    count = cur.fetchone()[0]
    if count > 0:
        return
    users = [
        ("admin", _hash_password("admin123"), "admin"),
        ("analyst", _hash_password("analyst123"), "analyst"),
        ("viewer", _hash_password("viewer123"), "viewer"),
    ]
    for username, password_hash, role in users:
        db_conn.execute(
            "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
            (username, password_hash, role, _now_iso()),
        )
    db_conn.commit()


def _get_user_from_token(token: str):
    if not token:
        return None
    cur = db_conn.execute(
        """
        SELECT users.id, users.username, users.role
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ?
        """,
        (token,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "role": row[2]}


def _require_roles(user, roles):
    if not user or user["role"] not in roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


def _get_current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1].strip()
    user = _get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


_ensure_default_users()


def _model_file_info():
    try:
        stat = os.stat(MODEL_PATH)
        last_trained = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        hasher = hashlib.sha256()
        with open(MODEL_PATH, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hasher.update(chunk)
        version = hasher.hexdigest()[:10]
        oob = getattr(rf_model, "oob_score_", None)
        accuracy = round(oob * 100, 2) if isinstance(oob, (int, float)) else None
        return {
            "version": version,
            "last_trained": last_trained,
            "accuracy": accuracy,
        }
    except Exception:
        return {
            "version": None,
            "last_trained": None,
            "accuracy": None,
        }


def _store_transaction(
    source,
    allocated_amount,
    spent_amount,
    work_status,
    prediction,
    risk_score,
    explanation,
    input_payload,
    user=None,
    review_status="Unreviewed",
):
    db_conn.execute(
        """
        INSERT INTO transactions (
            created_at, source, allocated_amount, spent_amount, work_status,
            prediction, risk_score, explanation, input_payload, review_status, user_id, user_name, user_role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            _now_iso(),
            source,
            allocated_amount,
            spent_amount,
            work_status,
            prediction,
            risk_score,
            json.dumps(explanation),
            json.dumps(input_payload),
            review_status,
            user["id"] if user else None,
            user["username"] if user else None,
            user["role"] if user else None,
        ),
    )
    db_conn.commit()

# -------------------------------
# Root
# -------------------------------
@app.get("/")
def home():
    return {"message": "AI-Based Public Fund Misuse Detection API Running"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": rf_model is not None,
    }


@app.post("/auth/login")
def login(payload: dict):
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", "")).strip()
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password required")
    cur = db_conn.execute(
        "SELECT id, password_hash, role FROM users WHERE username = ?",
        (username,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    role = row[2]
    # Viewers can sign in with any password
    if role != "viewer" and _hash_password(password) != row[1]:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = secrets.token_urlsafe(32)
    db_conn.execute(
        "INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)",
        (row[0], token, _now_iso()),
    )
    db_conn.commit()
    return {"token": token, "id": row[0], "username": username, "role": role}


@app.get("/auth/me")
def me(user=Depends(_get_current_user)):
    return {"id": user["id"], "username": user["username"], "role": user["role"]}


@app.post("/auth/logout")
def logout(user=Depends(_get_current_user), authorization: str | None = Header(default=None)):
    token = authorization.split(" ", 1)[1].strip()
    db_conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    db_conn.commit()
    return {"status": "ok"}


@app.get("/model-info")
def model_info(user=Depends(_get_current_user)):
    info = _model_file_info()
    return {
        "model_loaded": rf_model is not None,
        **info,
    }


def _fetch_report_stats():
    cur = db_conn.execute(
        """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN prediction = 'Fraud' THEN 1 ELSE 0 END) AS fraud_count
        FROM transactions
        """
    )
    row = cur.fetchone()
    total = row[0] if row and row[0] is not None else 0
    fraud = row[1] if row and row[1] is not None else 0
    normal = total - fraud
    pct = round((fraud / total) * 100, 2) if total else 0.0
    return {"total": total, "fraud": fraud, "normal": normal, "pct": pct}


def _fetch_top_alerts(threshold: float, limit: int = 10):
    cur = db_conn.execute(
        """
        SELECT id, created_at, prediction, risk_score
        FROM transactions
        WHERE risk_score >= ?
        ORDER BY risk_score DESC
        LIMIT ?
        """,
        (threshold, limit),
    )
    return cur.fetchall()


@app.get("/report/weekly")
def weekly_report(threshold: float = 75.0, user=Depends(_get_current_user)):
    _require_roles(user, {"admin", "analyst"})
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
    except Exception:
        raise HTTPException(status_code=500, detail="PDF engine not available. Install reportlab.")

    stats = _fetch_report_stats()
    alerts = _fetch_top_alerts(threshold)

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 50, "Weekly Fraud Report")
    c.setFont("Helvetica", 10)
    c.drawString(40, height - 70, f"Generated: {_now_iso()}")

    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, height - 100, "Summary")
    c.setFont("Helvetica", 10)
    c.drawString(40, height - 120, f"Total Transactions: {stats['total']}")
    c.drawString(40, height - 135, f"Fraud: {stats['fraud']} | Normal: {stats['normal']} | Fraud %: {stats['pct']}%")

    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, height - 165, f"Top Alerts (Risk >= {threshold}%)")
    c.setFont("Helvetica", 10)
    y = height - 185
    if not alerts:
        c.drawString(40, y, "No alerts at this threshold.")
    else:
        for row in alerts:
            c.drawString(40, y, f"TXN-{row[0]} | {row[1]} | {row[2]} | {row[3]}%")
            y -= 14
            if y < 50:
                c.showPage()
                y = height - 50

    c.showPage()
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=weekly_report.pdf"},
    )


def _to_float(value, field_name):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid numeric value for {field_name}: {value}")


def _apply_override(allocated_amount, spent_amount, work_status, prob):
    override = (
        spent_amount > allocated_amount * 1.2
        or (work_status == "Incomplete" and spent_amount > allocated_amount)
    )
    if override:
        return 1, max(prob, 80.0), True
    return None, prob, False


def _build_explanation(allocated_amount, spent_amount, work_status, pred):
    explanation = []

    if spent_amount > allocated_amount:
        explanation.append("Spending exceeds allocated amount")

    if work_status == "Incomplete":
        explanation.append("Work is incomplete")

    if spent_amount > allocated_amount * 1.5:
        explanation.append("High expenditure ratio detected")

    if pred == 1 and not explanation:
        explanation.append("Model flagged unusual spending pattern")

    if pred == 0 and not explanation:
        explanation.append("No suspicious pattern detected")

    return explanation


# -------------------------------
# Predict (Manual Input)
# -------------------------------
@app.post("/predict")
def predict(data: dict, user=Depends(_get_current_user)):
    try:
        _require_roles(user, {"admin", "analyst"})
        print("Incoming data:", data)

        if "allocated_amount" not in data or "spent_amount" not in data:
            raise ValueError("allocated_amount and spent_amount are required")

        allocated_amount = _to_float(data.get("allocated_amount"), "allocated_amount")
        spent_amount = _to_float(data.get("spent_amount"), "spent_amount")
        work_status = str(data.get("work_status", "")).strip()

        data["allocated_amount"] = allocated_amount
        data["spent_amount"] = spent_amount
        data["work_status"] = work_status

        print(
            "Types:",
            type(allocated_amount),
            type(spent_amount),
            type(work_status),
        )

        # Convert to DataFrame
        df = pd.DataFrame([data])

        # Preprocess
        X = preprocess(df)

        # ML Prediction
        pred = rf_model.predict(X)[0]
        prob = rf_model.predict_proba(X)[0][1] * 100

        # -------------------------------
        # RULE-BASED OVERRIDE
        # -------------------------------
        override_pred, prob, override_triggered = _apply_override(
            allocated_amount,
            spent_amount,
            work_status,
            prob,
        )
        if override_triggered:
            pred = override_pred
            print("Override triggered for /predict")
        else:
            print("No override for /predict")

        # Final label
        result = "Fraud" if pred == 1 else "Normal"

        # -------------------------------
        # EXPLANATION LOGIC (ALIGNED)
        # -------------------------------
        explanation = _build_explanation(
            allocated_amount,
            spent_amount,
            work_status,
            pred,
        )

        result_payload = {
            "prediction": result,
            "risk_score": round(prob, 2),
            "explanation": explanation,
            "debug": "override_triggered" if override_triggered else "no_override",
        }

        _store_transaction(
            source="manual",
            allocated_amount=allocated_amount,
            spent_amount=spent_amount,
            work_status=work_status,
            prediction=result_payload["prediction"],
            risk_score=result_payload["risk_score"],
            explanation=explanation,
            input_payload=data,
            user=user,
        )

        return result_payload

    except Exception as e:
        print("ERROR:", str(e))
        return {"error": str(e)}


# -------------------------------
# CSV Upload
# -------------------------------
@app.post("/upload")
def upload(file: UploadFile = File(...), user=Depends(_get_current_user)):
    try:
        _require_roles(user, {"admin", "analyst"})
        df = pd.read_csv(file.file)

        if "allocated_amount" not in df.columns or "spent_amount" not in df.columns:
            raise ValueError("CSV must include allocated_amount and spent_amount")

        # Convert numeric fields
        df["allocated_amount"] = pd.to_numeric(df["allocated_amount"], errors="raise")
        df["spent_amount"] = pd.to_numeric(df["spent_amount"], errors="raise")
        df["work_status"] = df.get("work_status", "").astype(str).str.strip()

        print("Incoming CSV sample:")
        print(df.head(3))
        print("Types:", df["allocated_amount"].dtype, df["spent_amount"].dtype)

        # Preprocess
        X = preprocess(df)

        # ML predictions
        preds = rf_model.predict(X)
        probs = rf_model.predict_proba(X)[:, 1] * 100

        # -------------------------------
        # APPLY RULE OVERRIDE ON CSV
        # -------------------------------
        override_flags = []
        for i in range(len(df)):
            allocated_amount = float(df.loc[i, "allocated_amount"])
            spent_amount = float(df.loc[i, "spent_amount"])
            work_status = str(df.loc[i, "work_status"]).strip()

            override_pred, prob, override_triggered = _apply_override(
                allocated_amount,
                spent_amount,
                work_status,
                probs[i],
            )
            if override_triggered:
                preds[i] = override_pred
                probs[i] = prob
                print(f"Override triggered for /upload row {i}")
            override_flags.append(override_triggered)

        # Add results
        df["prediction"] = np.where(preds == 1, "Fraud", "Normal")
        df["risk_score"] = np.round(probs, 2)
        df["debug"] = np.where(override_flags, "override_triggered", "no_override")

        records = df.to_dict(orient="records")

        # Store each row to DB
        for row in records:
            row_alloc = float(row.get("allocated_amount")) if row.get("allocated_amount") is not None else None
            row_spent = float(row.get("spent_amount")) if row.get("spent_amount") is not None else None
            row_status = str(row.get("work_status", "")).strip()
            row_pred_label = row.get("prediction")
            row_pred = 1 if row_pred_label == "Fraud" else 0
            row_expl = (
                _build_explanation(row_alloc, row_spent, row_status, row_pred)
                if row_alloc is not None and row_spent is not None
                else []
            )
            _store_transaction(
                source="csv",
                allocated_amount=row_alloc,
                spent_amount=row_spent,
                work_status=row_status,
                prediction=row_pred_label,
                risk_score=float(row.get("risk_score"))
                if row.get("risk_score") is not None
                else None,
                explanation=row_expl,
                input_payload=row,
                user=user,
            )

        return records

    except Exception as e:
        print("ERROR:", str(e))
        return {"error": str(e)}


# -------------------------------
# History (Persisted)
# -------------------------------
@app.get("/history")
def history(
    limit: int = 100,
    offset: int = 0,
    prediction: str | None = None,
    source: str | None = None,
    work_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_risk: float | None = None,
    max_risk: float | None = None,
    q: str | None = None,
    user=Depends(_get_current_user),
):
    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    clauses = []
    params: list = []

    if prediction:
        if prediction not in ("Fraud", "Normal"):
            raise HTTPException(status_code=400, detail="prediction must be Fraud or Normal")
        clauses.append("prediction = ?")
        params.append(prediction)

    if source:
        if source not in ("manual", "csv"):
            raise HTTPException(status_code=400, detail="source must be manual or csv")
        clauses.append("source = ?")
        params.append(source)

    if work_status:
        if work_status not in ("Completed", "Incomplete"):
            raise HTTPException(status_code=400, detail="work_status must be Completed or Incomplete")
        clauses.append("work_status = ?")
        params.append(work_status)

    if min_risk is not None:
        clauses.append("risk_score >= ?")
        params.append(float(min_risk))
    if max_risk is not None:
        clauses.append("risk_score <= ?")
        params.append(float(max_risk))

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            if dt_from.tzinfo is None:
                dt_from = dt_from.replace(tzinfo=timezone.utc)
            clauses.append("created_at >= ?")
            params.append(dt_from.isoformat())
        except ValueError:
            raise HTTPException(status_code=400, detail="date_from must be ISO format")

    if date_to:
        try:
            if len(date_to) == 10:
                dt_to = datetime.fromisoformat(date_to + "T23:59:59")
            else:
                dt_to = datetime.fromisoformat(date_to)
            if dt_to.tzinfo is None:
                dt_to = dt_to.replace(tzinfo=timezone.utc)
            clauses.append("created_at <= ?")
            params.append(dt_to.isoformat())
        except ValueError:
            raise HTTPException(status_code=400, detail="date_to must be ISO format")

    if q:
        q_like = f"%{q}%"
        clauses.append("(work_status LIKE ? OR prediction LIKE ? OR input_payload LIKE ?)")
        params.extend([q_like, q_like, q_like])

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    cur = db_conn.execute(
        f"""
        SELECT
            id, created_at, source, allocated_amount, spent_amount, work_status,
            prediction, risk_score, explanation, input_payload, review_status, user_id, user_name, user_role
        FROM transactions
        {where_sql}
        ORDER BY id DESC
        LIMIT ? OFFSET ?
        """,
        (*params, limit, offset),
    )
    rows = cur.fetchall()

    results = []
    for row in rows:
        results.append(
            {
                "id": row[0],
                "created_at": row[1],
                "source": row[2],
                "allocated_amount": row[3],
                "spent_amount": row[4],
                "work_status": row[5],
                "prediction": row[6],
                "risk_score": row[7],
                "explanation": json.loads(row[8]) if row[8] else [],
                "input_payload": json.loads(row[9]) if row[9] else {},
                "review_status": row[10] if len(row) > 10 else "Unreviewed",
                "user_id": row[11] if len(row) > 11 else None,
                "user_name": row[12] if len(row) > 12 else None,
                "user_role": row[13] if len(row) > 13 else None,
            }
        )

    return results


@app.post("/history/clear")
def clear_history(user=Depends(_get_current_user)):
    _require_roles(user, {"admin"})
    cur = db_conn.execute("SELECT COUNT(*) FROM transactions")
    count = cur.fetchone()[0]
    db_conn.execute("DELETE FROM transactions")
    db_conn.commit()
    return {"deleted": count}


@app.post("/transactions/{transaction_id}/status")
def update_transaction_status(transaction_id: int, payload: dict, user=Depends(_get_current_user)):
    _require_roles(user, {"admin", "analyst"})
    status = str(payload.get("status", "")).strip()
    if status not in {"Unreviewed", "Flagged", "Cleared"}:
        raise HTTPException(status_code=400, detail="status must be Unreviewed, Flagged, or Cleared")
    cur = db_conn.execute("SELECT id FROM transactions WHERE id = ?", (transaction_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Transaction not found")
    db_conn.execute(
        "UPDATE transactions SET review_status = ? WHERE id = ?",
        (status, transaction_id),
    )
    db_conn.commit()
    return {"id": transaction_id, "review_status": status}


@app.get("/users")
def list_users(user=Depends(_get_current_user)):
    _require_roles(user, {"admin"})
    cur = db_conn.execute("SELECT id, username, role, created_at FROM users ORDER BY id DESC")
    rows = cur.fetchall()
    return [
        {"id": row[0], "username": row[1], "role": row[2], "created_at": row[3]}
        for row in rows
    ]


@app.post("/users")
def create_user(payload: dict, user=Depends(_get_current_user)):
    _require_roles(user, {"admin"})
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", "")).strip()
    role = str(payload.get("role", "")).strip()
    if not username or not password or role not in {"admin", "analyst", "viewer"}:
        raise HTTPException(status_code=400, detail="username, password, and valid role required")
    try:
        db_conn.execute(
            "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
            (username, _hash_password(password), role, _now_iso()),
        )
        db_conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="username already exists")
    return {"status": "ok"}


@app.patch("/users/{user_id}")
def update_user(user_id: int, payload: dict, user=Depends(_get_current_user)):
    _require_roles(user, {"admin"})
    role = payload.get("role")
    password = payload.get("password")
    fields = []
    params = []
    if role:
        if role not in {"admin", "analyst", "viewer"}:
            raise HTTPException(status_code=400, detail="invalid role")
        fields.append("role = ?")
        params.append(role)
    if password:
        fields.append("password_hash = ?")
        params.append(_hash_password(str(password)))
    if not fields:
        raise HTTPException(status_code=400, detail="nothing to update")
    params.append(user_id)
    db_conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", params)
    db_conn.commit()
    return {"status": "ok"}


@app.delete("/users/{user_id}")
def delete_user(user_id: int, user=Depends(_get_current_user)):
    _require_roles(user, {"admin"})
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="cannot delete your own account")
    db_conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    db_conn.commit()
    return {"status": "ok"}
