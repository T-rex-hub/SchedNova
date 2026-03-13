from datetime import datetime, timezone
from sqlalchemy.orm import relationship
from .database import Base
from sqlalchemy import (
    VARCHAR, Column, DateTime, Integer, String,
    ForeignKey, Enum, JSON, Boolean, func
)


class User(Base):
    __tablename__ = "users"

    user_id = Column(VARCHAR(36), primary_key=True)  # UUID
    username = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    pass_word = Column(String(255), nullable=False)

    # Relationships
    departments = relationship("Department", back_populates="user", cascade="all, delete")
    classrooms = relationship("Classroom", back_populates="user", cascade="all, delete")
    batches = relationship("Batch", back_populates="user", cascade="all, delete")
    subjects = relationship("Subject", back_populates="user", cascade="all, delete")
    teachers = relationship("Teacher", back_populates="user", cascade="all, delete")
    timetables = relationship("Timetable", back_populates="user", cascade="all, delete")
    timeslots = relationship("Timeslot", back_populates="user", cascade="all, delete")


class Timeslot(Base):
    __tablename__ = "timeslots"

    timeslot_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(VARCHAR(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    day_of_week = Column(
        Enum("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", name="day_enum"),
        nullable=False
    )
    slot_number = Column(Integer, nullable=False)
    start_time = Column(String(10), nullable=False)  # e.g. "09:00"
    end_time = Column(String(10), nullable=False)    # e.g. "10:00"

    user = relationship("User", back_populates="timeslots")


class Department(Base):
    __tablename__ = "departments"

    department_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(VARCHAR(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    department_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="departments")
    batches = relationship("Batch", back_populates="department", cascade="all, delete")
    subjects = relationship("Subject", back_populates="department", cascade="all, delete")

class Classroom(Base):
    __tablename__ = "classrooms"

    classroom_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(VARCHAR(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    room_code = Column(String(20), nullable=False)
    classroom_type = Column(
        Enum("lecture_hall", "laboratory", "seminar_room", "auditorium",
             name="classroom_type_enum"),
        default="lecture_hall"
    )
    

    user = relationship("User", back_populates="classrooms")


class Batch(Base):
    __tablename__ = "batches"

    batch_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(VARCHAR(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    department_id = Column(Integer, ForeignKey("departments.department_id", ondelete="CASCADE"))
    batch_name = Column(String(50), nullable=False)

    user = relationship("User", back_populates="batches")
    department = relationship("Department", back_populates="batches")


class Subject(Base):
    __tablename__ = "subjects"

    subject_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(VARCHAR(36), ForeignKey("users.user_id", ondelete="SET NULL"))
    department_id = Column(
        Integer,
        ForeignKey("departments.department_id", ondelete="CASCADE"),
        nullable=False
    )

    subject_name = Column(String(255), nullable=False)
    course_code = Column(String(20), nullable=False)
    room_type = Column(String(100))
    classes_per_week = Column(Integer, nullable=False)
    duration = Column(Integer, default=1)
    max_lectures_per_day = Column(Integer, default=2)
    credits = Column(Integer, default=3)
    semester = Column(Integer, nullable=True)
    is_elective = Column(Boolean, default=False)

    user = relationship("User", back_populates="subjects")
    department = relationship("Department", back_populates="subjects")
    teacher_subjects = relationship(
        "TeacherSubject",
        back_populates="subject",
        cascade="all, delete"
    )
    batch_subjects = relationship(
        "BatchSubject",
        back_populates="subject",
        cascade="all, delete"
    )


class Teacher(Base):
    __tablename__ = "teachers"

    teacher_id = Column(Integer, primary_key=True)
    user_id = Column(VARCHAR(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    teacher_name = Column(String(255))
    availability_time_slots = Column(JSON)

    user = relationship("User", back_populates="teachers")
    teacher_subjects = relationship("TeacherSubject", back_populates="teacher")


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"
    teacher_id = Column(Integer, ForeignKey("teachers.teacher_id", ondelete="CASCADE"), primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id", ondelete="CASCADE"), primary_key=True)

    teacher = relationship("Teacher", back_populates="teacher_subjects")
    subject = relationship("Subject", back_populates="teacher_subjects")


class BatchSubject(Base):
    __tablename__ = "batch_subjects"

    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="CASCADE"), primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id", ondelete="CASCADE"), primary_key=True)
    classes_per_week = Column(Integer, nullable=False)

    subject = relationship("Subject", back_populates="batch_subjects")


class FixedGroup(Base):
    __tablename__ = "fixed_groups"

    group_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(VARCHAR(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    group_name = Column(String(100), nullable=False)
    group_size = Column(Integer, nullable=False)

    batches = relationship("FixedGroupBatch", back_populates="group")


class FixedGroupBatch(Base):
    __tablename__ = "fixed_group_batches"

    group_id = Column(Integer, ForeignKey("fixed_groups.group_id", ondelete="CASCADE"), primary_key=True)
    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="CASCADE"), primary_key=True)

    group = relationship("FixedGroup", back_populates="batches")


class Timetable(Base):
    __tablename__ = "timetables"

    timetable_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(VARCHAR(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    data = Column(JSON, nullable=False)

    user = relationship("User", back_populates="timetables")
