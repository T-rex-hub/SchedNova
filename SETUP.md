# SchedNova Setup Guide

## Quick Start

### 1. Install Python Dependencies

```bash
cd /Users/giteshgoyal/Desktop/SIH/SchedNova
pip install -r requirements.txt
```

If you get errors, make sure you're using Python 3.11+ and install each package manually:
```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv python-jose passlib google-auth ortools
```

### 2. Setup Environment Variables

Create a `.env` file in `backend/` directory:

```bash
cd backend
touch .env
```

Add these variables (replace with your actual credentials):
```
DB_HOST=aws-1-ap-south-1.pooler.supabase.com
DB_USER=postgres.nueihwfadzjbaacciwpq
DB_PORT=5432
DB_PASSWORD=your_actual_password
DB_NAME=postgres
GOOGLE_CLIENT_ID=your_actual_client_id
SECRET_KEY=your_secret_key_here
```

⚠️ **IMPORTANT**: Never commit `.env` to git! Add it to `.gitignore`:
```bash
echo ".env" >> .gitignore
```

### 3. Run the Backend

```bash
# From project root
cd /Users/giteshgoyal/Desktop/SIH/SchedNova

# Option 1: Using Python module
python -m uvicorn backend.main:app --reload --port 8000

# Option 2: Using uvicorn directly
uvicorn backend.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Test the backend:
- Open http://127.0.0.1:8000/docs in browser (FastAPI auto-docs)
- Or run: `python test_backend.py`

### 4. Run the Frontend

In a **new terminal**:

```bash
cd /Users/giteshgoyal/Desktop/SIH/SchedNova/frontend

# Install dependencies (if not done)
npm install

# Run dev server
npm run dev
```

You should see:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Open http://localhost:5173/ in your browser.

---

## Common Errors & Fixes

### Error: `ModuleNotFoundError: No module named 'google.oauth2'`

**Fix:** Install google-auth
```bash
pip install google-auth
```

### Error: `CORSMiddleware` import errors

**Fix:** This was due to duplicate imports - already fixed in your `main.py`.

### Error: Database connection failed

**Fix:** Check your `.env` file has correct credentials. Test connection:
```bash
cd /Users/giteshgoyal/Desktop/SIH/SchedNova
python time-table-generator/simple-test.py
```

### Error: Port 8000 already in use

**Fix:** Kill existing process or use different port:
```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
uvicorn backend.main:app --reload --port 8001
```
Then update frontend API calls to use port 8001.

### Error: Frontend can't connect to backend

**Fix:** Check CORS settings in `backend/main.py` line 36:
```python
allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
```
Make sure this matches your frontend URL.

---

## Testing the Timetable Generator

### Quick Test (without database)
```bash
python time-table-generator/simple-test.py
```

### Full Test (with database)
```bash
python time-table-generator/tt-generator.py
```

---

## File Structure

```
SchedNova/
├── backend/
│   ├── .env                  # Your secrets (don't commit!)
│   ├── main.py               # FastAPI entry point
│   ├── models.py             # Database models
│   ├── database.py           # DB connection
│   ├── deps.py               # Authentication
│   └── routers/              # API routes
│       ├── auth.py
│       ├── classrooms.py
│       ├── departments.py
│       ├── teacher.py
│       ├── batch.py
│       ├── groups.py
│       ├── timeslots.py
│       └── timetable.py
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       └── components/
├── time-table-generator/
│   ├── tt-generator.py       # Fixed & modular
│   └── simple-test.py        # Quick test
├── requirements.txt
└── SETUP.md                  # This file
```

---

## Changes Made

### 1. `tt-generator.py` - Complete Refactor
- **Before:** Single 370-line script, DB connection never closed, hardcoded values
- **After:** Modular class-based architecture, proper DB cleanup, configurable settings

### 2. `backend/main.py` - Import Fixes
- Removed duplicate `CORSMiddleware` import
- Removed duplicate `datetime` import
- Fixed OAuth2 token URL

### 3. `requirements.txt` - Added Missing Package
- Added `google-auth==2.38.0` (was missing)
- Fixed encoding issues

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Create `.env` file with your credentials
3. ✅ Run backend: `uvicorn backend.main:app --reload --port 8000`
4. ✅ Run frontend: `npm run dev` (in frontend/)
5. ✅ Test generator: `python time-table-generator/tt-generator.py`

Need help? Check the browser console (F12) for frontend errors, or the terminal running the backend for server errors.
