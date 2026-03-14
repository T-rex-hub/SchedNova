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

            # create department
            new_dept = models.Department(
                department_name=dept["department_name"],
                user_id=user.user_id
            )

            db.add(new_dept)
            db.flush()  # get department_id before commit

            # add subjects for this department
            for subject in dept.get("subjects", []):

                new_subject = models.Subject(
                    subject_name=subject["subject_name"],
                    course_code=subject["course_code"],
                    classes_per_week=subject["classes_per_week"],
                    room_type=subject["room_type"],
                    department_id=new_dept.department_id,
                    user_id=user.user_id
                )

                db.add(new_subject)

        db.commit()

        return {"message": "Departments and subjects added successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))