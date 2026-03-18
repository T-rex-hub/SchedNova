from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.deps import get_current_user
from backend import models

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("/add")
def add_groups(data: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):

    try:
        print(" GROUP API HIT")
        print("DATA RECEIVED:", data)
        for group in data["groups"]:

            new_group = models.FixedGroup(
                group_name=group["group_name"],
                department_id=group["department_id"],
                room_types=group.get("room_types", []),
                user_id=user.user_id
            )

            db.add(new_group)
            db.flush()
            print("INSERTED GROUP:", new_group.group_name)

            for batch_id in group["batch_ids"]:
                db.add(models.FixedGroupBatch(
                    group_id=new_group.group_id,
                    batch_id=int(batch_id)
                ))

        db.commit()

        return {"message": "Groups saved successfully"}

    except Exception as e:
        db.rollback()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))