from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db          # ✅ use shared get_db
from backend.deps import get_current_user
from backend import models

router = APIRouter(
    prefix="/timeslots",
    tags=["Timeslots"]
)

DAY_ORDER = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}

# -------------------------
# ADD / UPDATE TIMESLOTS
# -------------------------
@router.post("/add")
def add_timeslots(
    payload: dict = Body(...),
    user: models.User = Depends(get_current_user),  # ✅ User object
    db: Session = Depends(get_db),
):
    slots = payload.get("slots")

    if not slots:
        raise HTTPException(status_code=400, detail="No slots provided")

    # ✅ ALWAYS use user.user_id in DB queries
    db.query(models.Timeslot).filter(
        models.Timeslot.user_id == user.user_id
    ).delete()

    for slot in slots:
        ts = models.Timeslot(
            user_id=user.user_id,              
            day_of_week=slot["day_of_week"],
            slot_number=slot["slot_number"],
            start_time=slot["start_time"],
            end_time=slot["end_time"],
        )
        db.add(ts)

    db.commit()

    return {"status": "OK", "message": "Timeslots saved"}


@router.get("/list")
def list_timeslots(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(models.Timeslot).filter(
        models.Timeslot.user_id == user.user_id
    ).all()
    ordered = sorted(
        rows,
        key=lambda ts: (
            DAY_ORDER.get(ts.day_of_week, 99),
            ts.slot_number,
            ts.timeslot_id,
        ),
    )
    return [
        {
            "timeslot_id": ts.timeslot_id,
            "day_of_week": ts.day_of_week,
            "slot_number": ts.slot_number,
            "start_time": ts.start_time,
            "end_time": ts.end_time,
        }
        for ts in ordered
    ]


@router.delete("/{timeslot_id}")
def delete_timeslot(
    timeslot_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ts = db.query(models.Timeslot).filter(
        models.Timeslot.timeslot_id == timeslot_id,
        models.Timeslot.user_id == user.user_id
    ).first()
    
    if not ts:
        raise HTTPException(status_code=404, detail="Timeslot not found")
        
    db.delete(ts)
    db.commit()
    
    return {"status": "OK", "message": "Timeslot deleted"}