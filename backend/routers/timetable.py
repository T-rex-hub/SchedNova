# backend/routers/timetable.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from .. import models, schemas
from ..timetable_solver import solve_timetable

router = APIRouter(
    prefix="/timetable",
    tags=["Timetable"]
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/generate")
def generate_timetable(
    request: schemas.RequestData,
    db: Session = Depends(get_db)
):
    result = solve_timetable(request)

    if result["status"] != "OK":
        raise HTTPException(status_code=400, detail="No feasible timetable")

    timetable = models.Timetable(
        user_id=request.user_id,
        data=result["schedule"]
    )

    db.add(timetable)
    db.commit()
    db.refresh(timetable)

    return {
        "status": "OK",
        "timetable_id": timetable.timetable_id,
        "solve_time": result["solve_time"],
        "schedule": result["schedule"]
    }