# Breathe ESG Tech Intern Assignment Prototype

Django REST + React prototype that ingests three source types (SAP, utility electricity, and travel), normalizes activity data, flags suspicious records, and supports analyst review actions (approve/reject/lock) before audit lock-in.

## Stack

- Backend: Django + Django REST Framework
- Frontend: React + Vite
- DB: SQLite (prototype)

## Implemented requirements

- Three source ingestion paths:
  - SAP fuel/procurement (CSV upload)
  - Utility electricity (CSV upload)
  - Travel platform data (JSON array upload)
- Normalized emissions records with:
  - Source lineage
  - Unit normalization
  - Scope 1/2/3 categorization
  - Review status and audit metadata
- Dashboard:
  - Upload by source type
  - Suspicious row list
  - Approve/reject/lock actions
  - Summary counters by review state

## Project structure

- `backend/` Django project configuration
- `ingest/` models, normalizers, and REST endpoints
- `frontend/` React dashboard
- `sample_data/` realistic fabricated source payloads
- `MODEL.md`, `DECISIONS.md`, `TRADEOFFS.md`, `SOURCES.md` required writeups

## Run locally

### Backend

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Backend API is expected at `http://localhost:8000/api`.

## API endpoints

- `POST /api/batches/upload/`
- `GET /api/records/?tenant_code=acme`
- `POST /api/records/<id>/review/`
- `GET /api/dashboard/summary/?tenant_code=acme`

## Sample files to upload

- `sample_data/sap_fuel_procurement.csv` as source `sap`
- `sample_data/utility_electricity.csv` as source `utility`
- `sample_data/travel_platform.json` as source `travel`

## Deployment note

Deploy backend (Render/Railway/Fly) and frontend (Vercel/Netlify/Render static site), then set frontend API base URL to your deployed backend.
