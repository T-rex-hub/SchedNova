from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
import os
from backend.routers.classrooms import router as classrooms_router
from backend import db_utils, models, schemas, database
from backend.routers.auth import router as auth_router
from backend.routers.timeslots import router as timeslots_router
from backend.routers.timetable import router as timetable_router
from backend.timetable_solver import solve_timetable
from backend.routers import departments, subjects, teacher, batch, groups
app = FastAPI()


# ---------------- AUTH CONFIG ----------------
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 2

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DB ----------------
models.Base.metadata.create_all(bind=database.engine)

# Ensure new column exists for existing databases.
with database.engine.begin() as conn:
    conn.execute(
        text(
            "ALTER TABLE IF EXISTS subject_room_types "
            "ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 1"
        )
    )

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_jwt(user_id: str):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload["sub"]
    except Exception:
        user_id = token  # legacy fallback

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not logged in")

    return user

# ---------------- Routers ----------------
app.include_router(auth_router)
app.include_router(timeslots_router)
app.include_router(timetable_router)
app.include_router(classrooms_router)
app.include_router(departments.router)
app.include_router(subjects.router)
app.include_router(teacher.router)
app.include_router(batch.router)
app.include_router(groups.router)
# ---------------- Fetch timetable data ----------------
@app.get("/timetable-data")
def get_timetable_data(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db_utils.fetch_timetable_data(db, user.user_id)

# ---------------- Solve timetable ----------------
@app.post("/solve-timetable")
def solve_timetable_endpoint(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    raw_data = db_utils.fetch_timetable_data(db, user.user_id)
    timeslots_meta = raw_data.pop("timeslots_meta", [])
    display_lookups = raw_data.pop("display_lookups", {})

    if not raw_data.get("timeslots"):
        raise HTTPException(
            status_code=400,
            detail="No periods defined. Add timeslots under Schedule Configuration first.",
        )
    if not raw_data.get("rooms"):
        raise HTTPException(
            status_code=400,
            detail="No classrooms found. Add rooms before generating a timetable.",
        )
    if not raw_data.get("batches") or not raw_data.get("batch_subjects"):
        raise HTTPException(
            status_code=400,
            detail="No batches with subjects. Complete batches and subject assignment first.",
        )
    if not raw_data.get("subjects"):
        raise HTTPException(
            status_code=400,
            detail="No schedulable subjects. Assign teachers to subjects first.",
        )

    request_data = schemas.RequestData.model_validate(raw_data)

    solved = solve_timetable(request_data)

    if solved.get("status") != "OK":
        # Provide quick stats to help diagnose infeasibility quickly.
        debug_stats = {
            "batches": len(raw_data.get("batches") or []),
            "timeslots": len(raw_data.get("timeslots") or []),
            "rooms": len(raw_data.get("rooms") or {}),
            "subjects": len((raw_data.get("subjects") or {}).keys()),
            "fixed_groups_subjects": len((raw_data.get("fixed_groups") or {}).keys()),
        }
        fg = raw_data.get("fixed_groups") or {}
        try:
            debug_stats["fixed_groups_total"] = sum(
                len(v) for v in fg.values() if isinstance(v, list)
            )
        except Exception:
            debug_stats["fixed_groups_total"] = None

        raise HTTPException(
            status_code=400,
            detail={
                "message": "Solver could not find a feasible timetable. Relax constraints or add more rooms/teachers.",
                "status": solved.get("status"),
                "solve_time": solved.get("solve_time"),
                "debug": debug_stats,
            },
        )

    payload = {
        **solved,
        "timeslots_meta": timeslots_meta,
        "display_lookups": display_lookups,
    }

    new_tt = models.Timetable(
        user_id=user.user_id,
        data=payload,
        created_at=datetime.utcnow()
    )

    db.add(new_tt)
    db.commit()
    db.refresh(new_tt)

    return {
        "timetable_id": new_tt.timetable_id,
        "timetable": payload
    }

# ---------------- Get saved timetable ----------------
@app.get("/timetable/{timetable_id}")
def get_saved_timetable(
    timetable_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tt = (
        db.query(models.Timetable)
        .filter(
            models.Timetable.timetable_id == timetable_id,
            models.Timetable.user_id == user.user_id
        )
        .first()
    )
    if not tt:
        return {"error": "Timetable not found"}

    return {
        "timetable_id": tt.timetable_id,
        "timetable": tt.data
    }


@app.get("/timetables")
def list_timetables(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Timetable)
        .filter(models.Timetable.user_id == user.user_id)
        .order_by(models.Timetable.timetable_id.desc())
        .all()
    )
    out = []
    for r in rows:
        data = r.data if isinstance(r.data, dict) else {}
        sched = data.get("schedule") or []
        out.append(
            {
                "timetable_id": r.timetable_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "status": data.get("status"),
                "solve_time": data.get("solve_time"),
                "entries_count": len(sched) if isinstance(sched, list) else 0,
            }
        )
    return out


@app.delete("/timetable/{timetable_id}")
def delete_timetable(
    timetable_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tt = (
        db.query(models.Timetable)
        .filter(
            models.Timetable.timetable_id == timetable_id,
            models.Timetable.user_id == user.user_id,
        )
        .first()
    )
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable not found")
    db.delete(tt)
    db.commit()
    return {"message": "Timetable deleted", "timetable_id": timetable_id}

