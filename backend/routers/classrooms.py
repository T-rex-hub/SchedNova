from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Classroom
from backend.schemas import ClassroomCreate
from backend.deps import get_current_user

router = APIRouter(prefix="/classrooms", tags=["classrooms"])

@router.post("/add")
def add_classrooms(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    try:
        rooms = payload.get("rooms")
        if not rooms:
            raise HTTPException(status_code=400, detail="No rooms provided")

        for room in rooms:
            db_room = Classroom(
                user_id=user.user_id,
                room_code=room["room_code"],
                classroom_type=room["classroom_type"],
                
            )
            db.add(db_room)

        db.commit()
        return {"message": "Rooms saved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))