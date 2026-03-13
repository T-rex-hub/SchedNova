from sqlalchemy.orm import Session
from . import models
import json

def fetch_timetable_data(db: Session, user_id: str):
    # --- Pre-fetch user's departments ---
    user_departments = {d.department_id: d for d in db.query(models.Department).filter_by(user_id=user_id).all()}

    # --- Teachers ---
    teachers = {}
    for t in db.query(models.Teacher).filter_by(user_id=user_id).all():
        subjects = []
        for ts in db.query(models.TeacherSubject).filter_by(teacher_id=t.teacher_id).all():
            subj = db.query(models.Subject).filter_by(subject_id=ts.subject_id).first()
            if subj and subj.department_id in user_departments:
                subjects.append(subj.subject_id)
        if not subjects:
            continue

        availability = t.availability_time_slots
        if isinstance(availability, str):
            try:
                availability = json.loads(availability)
            except:
                availability = []
        elif availability is None:
            availability = []

        teachers[t.teacher_id] = {
            "teacher_name": t.teacher_name,
            "subjects": subjects,                # subject_ids
            "available_shifts": availability,    # timeslot_ids
        }

    # --- Subjects ---
    subjects = {}
    for s in db.query(models.Subject).filter(models.Subject.department_id.in_(user_departments.keys())).all():
        subj_teachers = [
            ts.teacher_id
            for ts in db.query(models.TeacherSubject).filter_by(subject_id=s.subject_id).all()
        ]
        subjects[s.subject_id] = {
            "subject_name": s.subject_name,
            "course_code": s.course_code,
            "teachers": subj_teachers,   # teacher_ids
            "room_type": s.room_type,
            "per_week": s.classes_per_week,
            "duration": s.duration,
        }

    # --- Rooms (per user) ---
    rooms = {r.room_code: r.classroom_type for r in db.query(models.Classroom).filter_by(user_id=user_id).all()}

    # --- Batches and subjects ---
    batches = []
    batch_subjects = {}
    for b in db.query(models.Batch).filter_by(user_id=user_id).all():
        if b.department_id not in user_departments:
            continue
        batches.append(b.batch_id)
        batch_subjects[b.batch_id] = {}
        for bs in db.query(models.BatchSubject).filter_by(batch_id=b.batch_id).all():
            subj = db.query(models.Subject).filter_by(subject_id=bs.subject_id).first()
            if subj:
                batch_subjects[b.batch_id][subj.subject_id] = bs.classes_per_week

    # --- Fixed Groups ---
    fixed_groups = {}
    for fg in db.query(models.FixedGroup).filter_by(user_id=user_id).all():
        fg_batches = db.query(models.FixedGroupBatch).filter_by(group_id=fg.group_id).all()
        batch_list = [b.batch_id for b in fg_batches]
        if fg.group_id not in fixed_groups:
            fixed_groups[fg.group_id] = []
        fixed_groups[fg.group_id].append(batch_list)

    return {
        "user_id": user_id,
        "batches": batches,              # list of batch_ids
        "timeslots": list(range(35)),    # placeholder
        "rooms": rooms,                  # {room_code: room_type}
        "teachers": teachers,            # {teacher_id: {...}}
        "subjects": subjects,            # {subject_id: {...}}
        "batch_subjects": batch_subjects,# {batch_id: {subject_id: per_week}}
        "fixed_groups": fixed_groups,    # {group_id: [[batch_ids]]}
    }
