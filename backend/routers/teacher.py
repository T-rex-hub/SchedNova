from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.deps import get_current_user

router = APIRouter(prefix="/teachers", tags=["Teachers"])


# -------------------------------------------------
# Create Teacher + assign subjects
# -------------------------------------------------
@router.post("/add")
def add_teacher(data: dict, db: Session = Depends(get_db), user = Depends(get_current_user)):

    try:
        new_teacher = models.Teacher(
            teacher_name=data["teacher_name"],
            user_id=user.user_id,
            availability_time_slots=data.get("availability_time_slots", {})
        )

        db.add(new_teacher)
        db.flush()  # get teacher_id before commit

        # Assign subjects to teacher
        for subject_id in data.get("subjects", []):
            db.add(models.TeacherSubject(
                teacher_id=new_teacher.teacher_id,
                subject_id=subject_id
            ))

        db.commit()

        return {
            "message": "Teacher added successfully",
            "teacher_id": new_teacher.teacher_id
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------
# Get all teachers for logged-in user
# -------------------------------------------------
@router.get("/")
def get_teachers(db: Session = Depends(get_db), user = Depends(get_current_user)):

    teachers = db.query(models.Teacher).filter(
        models.Teacher.user_id == user.user_id
    ).all()

    return teachers


# -------------------------------------------------
# Get subjects (for teacher assignment dropdown)
# -------------------------------------------------
@router.get("/subjects")
def get_subjects(db: Session = Depends(get_db), user = Depends(get_current_user)):

    subjects = db.query(models.Subject).filter(
        models.Subject.user_id == user.user_id
    ).all()

    return [
        {
            "subject_id": s.subject_id,
            "subject_name": s.subject_name,
            "course_code": s.course_code
        }
        for s in subjects
    ]


# -------------------------------------------------
# Delete teacher
# -------------------------------------------------
@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):

    teacher = db.query(models.Teacher).filter(
        models.Teacher.teacher_id == teacher_id,
        models.Teacher.user_id == user.user_id
    ).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    db.delete(teacher)
    db.commit()

    return {"message": "Teacher deleted successfully"}