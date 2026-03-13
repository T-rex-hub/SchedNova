from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db          # ✅ use shared get_db
from backend.deps import get_current_user
from backend import models

router = APIRouter(
    prefix="/timeslots",
    tags=["Timeslots"]
)

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
            user_id=user.user_id,              # ✅ FIXED
            day_of_week=slot["day_of_week"],
            slot_number=slot["slot_number"],
            start_time=slot["start_time"],
            end_time=slot["end_time"],
        )
        db.add(ts)

    db.commit()

    return {"status": "OK", "message": "Timeslots saved"}