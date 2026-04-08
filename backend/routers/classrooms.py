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

@router.get("/")
def get_classrooms(
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    rooms = db.query(Classroom).filter(Classroom.user_id == user.user_id).all()

    # Return unique classroom types only
    types = list({r.classroom_type for r in rooms})
    return types


@router.get("/list")
def list_classrooms(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    rows = db.query(Classroom).filter(Classroom.user_id == user.user_id).all()
    return [
        {
            "classroom_id": r.classroom_id,
            "room_code": r.room_code,
            "classroom_type": r.classroom_type,
        }
        for r in rows
    ]


@router.delete("/{classroom_id}")
def delete_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    row = (
        db.query(Classroom)
        .filter(
            Classroom.classroom_id == classroom_id,
            Classroom.user_id == user.user_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Classroom not found")
    db.delete(row)
    db.commit()
    return {"message": "Classroom deleted", "classroom_id": classroom_id}