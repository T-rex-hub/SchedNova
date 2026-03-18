from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.deps import get_current_user
from backend import models

router = APIRouter(prefix="/batches", tags=["Batches"])


@router.post("/add")
def add_batches(data: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):

    try:
        print("Incoming batch payload:", data)

        batches = data.get("batches", [])

        if not isinstance(batches, list) or len(batches) == 0:
            raise HTTPException(status_code=400, detail="No batches provided")

        inserted = 0

        for batch in batches:
            batch_name = batch.get("batch_name")
            department_id = batch.get("department_id")
            subjects = batch.get("subjects", [])
            if not batch_name or not department_id:
                continue

            new_batch = models.Batch(
                batch_name=str(batch_name).strip(),
                department_id=department_id,
                user_id=user.user_id
            )

            db.add(new_batch)
            db.flush()
            for subject_id in subjects:
                batch_subject = models.BatchSubject(
                    batch_id=new_batch.batch_id,
                    subject_id=subject_id
                )

                db.add(batch_subject)

            inserted += 1

        db.commit()

        return {"message": "Batches saved successfully", "inserted": inserted}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/")
def get_batches(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    batches = db.query(models.Batch).filter(
        models.Batch.user_id == user.user_id
    ).all()

    result = []

    for batch in batches:
        batch_subjects = db.query(models.BatchSubject).filter(
            models.BatchSubject.batch_id == batch.batch_id
        ).all()

        subject_ids = [bs.subject_id for bs in batch_subjects]

        result.append({
            "batch_id": batch.batch_id,
            "batch_name": batch.batch_name,
            "department_id": batch.department_id,
            "subjects": subject_ids
        })

    return result