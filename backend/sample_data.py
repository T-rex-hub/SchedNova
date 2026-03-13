import uuid
from sqlalchemy.orm import Session
from backend.database import SessionLocal, Base, engine
from backend.models import Department, Batch, Classroom, Teacher, Subject, TeacherSubject, BatchSubject, FixedGroup, FixedGroupBatch

# Sample data from your timetable
sample_batches = [
    "Batch1", "Batch2", "Batch3", "Batch4", 
    "Batch5", "Batch6", "Batch7", "Batch8", 
    "Batch9", "Batch10", "Batch11", "Batch12"
]

sample_rooms = {
    "LH1": "lecture_hall",
    "LH2": "lecture_hall",
    "LH3": "lecture_hall",
    "LH4": "lecture_hall",
    "Lab1": "laboratory",
    "Lab2": "laboratory",
    "Lab3": "laboratory"
}

sample_teachers = {
    "Dr. Sharma": {"subjects": ["Math","Physics"], "available_shifts": list(range(35))},
    "Prof. Singh": {"subjects": ["Chemistry","Biology"], "available_shifts": list(range(0,35,2))},
    "Dr. Gupta": {"subjects": ["ComputerLab","English"], "available_shifts": list(range(5,35))},
    "Dr. Verma": {"subjects": ["Math","Physics","Chemistry","English"], "available_shifts": list(range(30))},
    "Dr. Kapoor": {"subjects": ["History","Geography"], "available_shifts": list(range(35))},
    "Prof. Mehta": {"subjects": ["ComputerLab","Physics"], "available_shifts": list(range(10,35))},
    "Dr. Iyer": {"subjects": ["English","Biology"], "available_shifts": list(range(20))},
}

sample_subjects = {
    "Math": {"teachers": ["Dr. Sharma","Dr. Verma"], "room_type": "lecture_hall", "per_week": 4},
    "Physics": {"teachers": ["Dr. Sharma","Dr. Verma","Prof. Mehta"], "room_type": "lecture_hall", "per_week": 3},
    "Chemistry": {"teachers": ["Prof. Singh","Dr. Verma"], "room_type": "lecture_hall", "per_week": 3},
    "ComputerLab": {"teachers": ["Dr. Gupta","Prof. Mehta"], "room_type": "laboratory", "per_week": 2},
    "English": {"teachers": ["Dr. Verma","Dr. Gupta","Dr. Iyer"], "room_type": "lecture_hall", "per_week": 2},
    "Biology": {"teachers": ["Prof. Singh","Dr. Iyer"], "room_type": "lecture_hall", "per_week": 2},
    "History": {"teachers": ["Dr. Kapoor"], "room_type": "lecture_hall", "per_week": 2},
    "Geography": {"teachers": ["Dr. Kapoor"], "room_type": "lecture_hall", "per_week": 2},
}

sample_batch_subjects = {
    "Batch1": {"Math":4, "Physics":3, "English":2},
    "Batch2": {"Math":3, "Chemistry":3, "Biology":2},
    "Batch3": {"Physics":2, "Chemistry":3, "ComputerLab":1},
    "Batch4": {"Math":3, "English":2, "Biology":2},
    "Batch5": {"History":2, "Geography":2},
    "Batch6": {"Math":3, "Physics":2, "Chemistry":2},
    "Batch7": {"English":2, "Biology":3, "History":2},
    "Batch8": {"ComputerLab":1, "Physics":3, "Geography":2},
    "Batch9": {"Math":3, "Chemistry":3, "History":2},
    "Batch10": {"Physics":3, "Biology":2, "English":2},
    "Batch11": {"Math":2, "Chemistry":2, "ComputerLab":1},
    "Batch12": {"History":3, "English":2, "Geography":2}
}

sample_fixed_groups = {
    "Math": [("Batch1","Batch2"), ("Batch4","Batch6"), ("Batch9","Batch11")],
    "Biology": [("Batch2","Batch4","Batch7","Batch10")],
    "Physics": [("Batch1",), ("Batch3",), ("Batch6",), ("Batch8",), ("Batch10",)],
    "Chemistry": [("Batch2",), ("Batch3",), ("Batch6",), ("Batch9",), ("Batch11",)],
    "English": [("Batch1",), ("Batch4",), ("Batch7",), ("Batch10",), ("Batch12",)],
    "ComputerLab": [("Batch3",), ("Batch8",), ("Batch11",)],
    "History": [("Batch5",), ("Batch7",), ("Batch9",), ("Batch12",)],
    "Geography": [("Batch5",), ("Batch8",), ("Batch12",)]
}


def populate_data(db: Session):
    # 1️⃣ Create a dummy department
    dept = Department(user_id=None, department_name="CSE", total_students=200, total_faculty=10)
    db.add(dept)
    db.commit()
    db.refresh(dept)

    # 2️⃣ Insert batches
    batch_objs = {}
    for b_name in sample_batches:
        batch = Batch(batch_number=b_name, department_id=dept.department_id)
        db.add(batch)
        db.commit()
        db.refresh(batch)
        batch_objs[b_name] = batch

    # 3️⃣ Insert classrooms
    for cname, ctype in sample_rooms.items():
        db.add(Classroom(classroom_code=cname, classroom_type=ctype))
    db.commit()

    # 4️⃣ Insert subjects
    subject_objs = {}
    for sname, info in sample_subjects.items():
        subj = Subject(
            department_id=dept.department_id,
            subject_name=sname,
            course_code=sname[:4].upper(),
            room_type=info["room_type"],
            classes_per_week=info["per_week"]
        )
        db.add(subj)
        db.commit()
        db.refresh(subj)
        subject_objs[sname] = subj

    # 5️⃣ Insert teachers
    teacher_objs = {}
    for tname, info in sample_teachers.items():
        teacher = Teacher(
            department_id=dept.department_id,
            teacher_name=tname,
            availability_time_slots=info["available_shifts"]
        )
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        teacher_objs[tname] = teacher

        # TeacherSubject mapping
        for sname in info["subjects"]:
            db.add(TeacherSubject(teacher_id=teacher.teacher_id, subject_id=subject_objs[sname].subject_id))
    db.commit()

    # 6️⃣ BatchSubject mapping
    for bname, subjects in sample_batch_subjects.items():
        for sname, per_week in subjects.items():
            db.add(BatchSubject(batch_id=batch_objs[bname].batch_id,
                                subject_id=subject_objs[sname].subject_id,
                                classes_per_week=per_week))
    db.commit()

    # 7️⃣ FixedGroups
    for sname, groups in sample_fixed_groups.items():
        for group in groups:
            fg = FixedGroup(subject_id=subject_objs[sname].subject_id)
            db.add(fg)
            db.commit()
            db.refresh(fg)

            # Map batches to group
            for bname in group:
                db.add(FixedGroupBatch(group_id=fg.group_id, batch_id=batch_objs[bname].batch_id))
            db.commit()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    populate_data(db)
    db.close()
    print("Sample timetable data populated successfully!")
