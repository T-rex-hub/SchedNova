from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.deps import get_current_user
from backend import models

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("/add")
def add_groups(data: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):

    try:
        # Replace previous groups to avoid stale constraints stacking up.
        db.query(models.FixedGroup).filter(
            models.FixedGroup.user_id == user.user_id
        ).delete(synchronize_session=False)

        for group in data["groups"]:

            new_group = models.FixedGroup(
                group_name=group["group_name"],
                department_id=group["department_id"],
                room_types=group.get("room_types", []),
                user_id=user.user_id
            )

            db.add(new_group)
            db.flush()

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


@router.get("/")
def list_groups(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(models.FixedGroup).filter(
        models.FixedGroup.user_id == user.user_id
    ).all()
    out = []
    for g in rows:
        out.append(
            {
                "group_id": g.group_id,
                "group_name": g.group_name,
                "department_id": g.department_id,
                "room_types": g.room_types or [],
                "batch_ids": [b.batch_id for b in g.batches],
            }
        )
    return out


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    row = (
        db.query(models.FixedGroup)
        .filter(
            models.FixedGroup.group_id == group_id,
            models.FixedGroup.user_id == user.user_id,
        )
        .first()
    )
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(row)
    db.commit()
    return {"message": "Group deleted", "group_id": group_id}