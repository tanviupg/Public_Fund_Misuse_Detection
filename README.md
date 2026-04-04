# Public Fund Misuse Detection

Full-stack web app to detect suspicious public fund transactions with role-based dashboards, analytics, and reports.

## Highlights
- Role-based access (admin/analyst/viewer)
- Manual prediction and CSV batch upload
- Review workflow (Flag/Clear)
- Reports (CSV + PDF)
- Analytics dashboard

## Tech Stack
- Backend: FastAPI, scikit-learn, pandas
- Frontend: React + Vite + Tailwind
- DB: SQLite

## Project Structure
- `backend/` FastAPI API and ML model
- `frontend/` React UI

## Setup

### Backend (FastAPI)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Vite + React)
```powershell
cd frontend
npm install
npm run dev
```

Notes:
- For Mac/Linux, activate venv with `source .venv/bin/activate`.
- Do not commit `frontend/node_modules`.

## Default Demo Accounts
- `admin / admin123`
- `analyst / analyst123`
- `viewer / any-password`

## Core API Endpoints
- `GET /health` Service status + model loaded
- `POST /predict` Single prediction (admin/analyst)
- `POST /upload` CSV batch predictions (admin/analyst)
- `GET /history` History with filters
- `POST /history/clear` Clear history (admin)
- `GET /model-info` Model metadata
- `GET /report/weekly` PDF report (admin/analyst)
- `POST /transactions/{id}/status` Review status (admin/analyst)
- `POST /auth/login` Login
- `POST /auth/logout` Logout
- `GET /auth/me` Current user

## Model
The RandomForest model is stored at:
- `backend/models/random_forest.pkl`

If you retrain the model, replace the file and restart the backend.

## License
MIT
