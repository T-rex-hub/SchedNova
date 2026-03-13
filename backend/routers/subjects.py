from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.deps import get_current_user
from backend import models

router = APIRouter(
    prefix="/subjects",
    tags=["Subjects"]
)

@router.post("/add")
def add_subjects(
    payload: dict,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    department_id = payload.get("department_id")
    subjects = payload.get("subjects", [])

    if not department_id or not subjects:
        raise HTTPException(status_code=400, detail="Invalid payload")

    created = []

    for s in subjects:
        name = s.get("subject_name")
        code = s.get("course_code")
        room_type = s.get("room_type", "lecture_hall")
        classes = s.get("classes_per_week", 1)
        duration = s.get("duration", 1)
        max_per_day = s.get("max_lectures_per_day", 2)

        if not name or not code:
            continue

        # prevent duplicates
        exists = db.query(models.Subject).filter(
            models.Subject.department_id == department_id,
            models.Subject.subject_name == name
        ).first()

        if exists:
            continue

        obj = models.Subject(
            user_id=user.user_id,
            department_id=department_id,
            subject_name=name,
            course_code=code,
            room_type=room_type,
            classes_per_week=classes,
            duration=duration,
            max_lectures_per_day=max_per_day
        )

        db.add(obj)
        created.append(obj)

    db.commit()
    return {
        "message": "Subjects added",
        "count": len(created)
    }