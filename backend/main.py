from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import parse_obj_as
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from datetime import timedelta
import os
from backend.routers.classrooms import router as classrooms_router
from backend import db_utils, models, schemas, database
from backend.routers.auth import router as auth_router
from backend.routers.timeslots import router as timeslots_router
from backend.routers.timetable import router as timetable_router
from backend.timetable_solver import solve_timetable
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import departments
from backend.routers import subjects
from backend.routers import teacher
from backend.routers import batch
from backend.routers import groups
app = FastAPI()


# ---------------- AUTH CONFIG ----------------
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 2

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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
    request_data = parse_obj_as(schemas.RequestData, raw_data)

    solved = solve_timetable(request_data)

    new_tt = models.Timetable(
        user_id=user.user_id,
        data=solved,
        created_at=datetime.utcnow()
    )

    db.add(new_tt)
    db.commit()
    db.refresh(new_tt)

    return {
        "timetable_id": new_tt.timetable_id,
        "timetable": solved
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
    
