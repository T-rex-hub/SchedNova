import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.deps import get_current_user
from backend import models

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.post("/add")
def add_departments(data: dict, db: Session = Depends(get_db), user = Depends(get_current_user)):

    try:
        for dept in data["departments"]:

            new_dept = models.Department(
                department_name=dept["department_name"],
                user_id=user.user_id
            )

            db.add(new_dept)
            db.flush()

            for subject in dept.get("subjects", []):

                subject_name = subject.get("subject_name")
                course_code = subject.get("course_code")

                if not subject_name or not course_code:
                    continue

                new_subject = models.Subject(
                    subject_name=subject_name,
                    course_code=course_code,
                    department_id=new_dept.department_id,
                    user_id=user.user_id
                )

                db.add(new_subject)
                db.flush()

                # Insert room types if provided
                for room in subject.get("rooms", []):
                    room_type = room.get("room_type")
                    classes_per_week = room.get("classes_per_week", 0)

                    if not room_type:
                        continue

                    room_entry = models.SubjectRoomType(
                        subject_id=new_subject.subject_id,
                        room_type=room_type,
                        classes_per_week=classes_per_week
                    )

                    db.add(room_entry)

        db.commit()

        return {"message": "Departments and subjects added successfully"}

    except Exception as e:
        db.rollback()
        print("ERROR WHILE SAVING DEPARTMENT:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ✅ THIS MUST BE OUTSIDE THE FUNCTION
@router.get("/with-subjects")
def get_departments_with_subjects(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    departments = db.query(models.Department).filter(
        models.Department.user_id == user.user_id
    ).all()

    result = []

    for dept in departments:
        subjects = db.query(models.Subject).filter(
            models.Subject.department_id == dept.department_id
        ).all()

        result.append({
            "department_id": dept.department_id,
            "department_name": dept.department_name,
            "subjects": [
                {
                    "subject_id": s.subject_id,
                    "subject_name": s.subject_name,
                    "subject_code": s.course_code
                }
                for s in subjects
            ]
        })

    return result