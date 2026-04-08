# SchedNova Setup and Deployment

## 1) Local Development

### Backend
1. Copy env template:
   - `cp backend/.env.example backend/.env`
2. Fill values in `backend/.env`
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Run API:
   - `uvicorn backend.main:app --reload --port 8000`

### Frontend
1. Copy env template:
   - `cp frontend/.env.example frontend/.env`
2. Install dependencies:
   - `cd frontend && npm install`
3. Run frontend:
   - `npm run dev`

## 2) Required Environment Variables

### Backend (`backend/.env`)
- `DATABASE_URL` (recommended) or `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_NAME`
- `SECRET_KEY` (required in all environments)
- `CORS_ORIGINS` (comma-separated frontend URLs)
- `GOOGLE_CLIENT_ID` (if using Google auth)

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL` (backend public URL)

## 3) Production Deployment Checklist

- Set production `VITE_API_BASE_URL` to your backend domain (for example `https://api.yourdomain.com`)
- Set production `CORS_ORIGINS` to your frontend domain (for example `https://app.yourdomain.com`)
- Use a strong `SECRET_KEY` (do not reuse local/dev values)
- Use managed Postgres and set `DATABASE_URL`
- Ensure `.env` files are never committed (already ignored by `.gitignore`)
- Build frontend:
  - `cd frontend && npm run build`
- Serve `frontend/dist` from your static host (Vercel/Netlify/Nginx)
- Run backend with a production ASGI server:
  - `uvicorn backend.main:app --host 0.0.0.0 --port 8000`

## 4) Quick Verification After Deploy

- Backend health:
  - Open `https://your-backend-domain/docs`
- Frontend:
  - Login works
  - Add periods/rooms/departments/teachers/batches/groups
  - Generate timetable works
  - Saved timetables list/load/delete works

## 5) Deploy Backend on Railway

This repo is pre-configured for Railway backend deployment with:
- `railway.json`
- `Dockerfile`
- `Procfile` (optional fallback)

### Railway steps
1. Create a new Railway project and link this GitHub repo.
2. Add a PostgreSQL service in Railway.
3. In backend service variables, set:
   - `DATABASE_URL` (from Railway Postgres)
   - `SECRET_KEY` (long random value)
   - `CORS_ORIGINS` (your frontend URL, comma-separated if multiple)
   - `GOOGLE_CLIENT_ID` (if Google auth is enabled)
4. Deploy.
5. Verify API:
   - Open `https://<your-railway-domain>/docs`

### Frontend note
- If frontend is on Vercel, set:
  - `VITE_API_BASE_URL=https://<your-railway-domain>`
