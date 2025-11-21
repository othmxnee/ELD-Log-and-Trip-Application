# HOS ELD MVP

This repository contains an MVP for an Hours-of-Service (HOS) ELD application: Django + DRF backend and React frontend (Vite).

Structure

- /backend: Django project and trips app
- /frontend: React Vite app (skeleton)

Quick start (development)

Backend

1. Create a virtualenv and install requirements:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

2. Run migrations and start server:

```bash
cd backend
python manage.py migrate
python manage.py runserver
```

Frontend

```bash
cd frontend
npm install
npm run dev
```

API Endpoints (MVP)

- POST /api/trips/ -> create trip
- GET /api/trips/<id>/route/ -> returns route geometry and legs
- POST /api/trips/<id>/compute-logs/ -> computes HOS segments
- POST /api/trips/<id>/render-log/ -> accepts pages JSON and (MVP) responds with placeholder

Demo script (3-5 minutes Loom)

1. Show the NewTrip form and create a sample trip (pre-filled).
2. Open Trip View (or click sample) and hit Compute Logs.
3. Show the rendered canvas with duty segments on top of blank-log.png.
4. Download the PNG and mention PDF export path (backend stub).
5. Briefly open tests/trips to show HOS unit tests and mention next steps.

Notes and next steps

- ORS integration: set ORS_API_KEY in backend env to enable real routing.
- Render PDF generation: implement backend using ReportLab/Pillow and accept uploaded canvas PNGs.
- Deploy: frontend to Vercel, backend to Render/Railway (use DATABASE_URL env var and configure). 
# ELD-Log-and-Trip-Application
