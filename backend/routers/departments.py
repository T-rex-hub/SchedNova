from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.deps import get_current_user
from backend import models

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.post("/add")
def add_departments(payload: dict, 
                    db: Session = Depends(get_db),
                    user=Depends(get_current_user)):

    departments = payload.get("departments", [])
    if not departments:
        raise HTTPException(status_code=400, detail="No departments provided")

    created = []
    for dept in departments:
        name = dept.get("department_name")
        if not name:
            continue

        # prevent duplicates per user
        exists = db.query(models.Department).filter(
            models.Department.user_id == user.user_id,
            models.Department.department_name == name
        ).first()

        if exists:
            continue

        obj = models.Department(
            user_id=user.user_id,
            department_name=name
        )
        db.add(obj)
        created.append(obj)

    db.commit()
    return {"message": "Departments added", "count": len(created)}