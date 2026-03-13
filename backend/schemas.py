from pydantic import BaseModel, EmailStr
from typing import List, Dict, Optional


# ------------------ AUTH ------------------
class UserLogin(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str

    class Config:
        from_attributes = True


# ------------------ DEPARTMENT ------------------
class DepartmentCreate(BaseModel):
    department_name: str
    total_students: Optional[int] = 0
    total_faculty: Optional[int] = 0


class DepartmentResponse(DepartmentCreate):
    department_id: int
    user_id: str

    class Config:
        from_attributes = True


# ------------------ TEACHERS / SUBJECTS ------------------
class TeacherInput(BaseModel):
    teacher_name: str
    subjects: List[int]                # subject_ids
    available_shifts: List[int]        # timeslot_ids


class SubjectInput(BaseModel):
    subject_name: str
    course_code: str
    room_type: str
    per_week: int
    duration: int
    teachers: List[int]                # teacher_ids


# ------------------ TIMETABLE REQUEST ------------------
class RequestData(BaseModel):
    user_id: str
    batches: List[int]
    timeslots: List[int]
    rooms: Dict[str, str]
    teachers: Dict[int, TeacherInput]
    subjects: Dict[int, SubjectInput]
    batch_subjects: Dict[int, Dict[int, int]]   # batch_id → {subject_id: per_week}
    fixed_groups: Dict[int, List[List[int]]]    # group_id → [[batch_ids]]


# ------------------ TIMETABLE RESPONSE ------------------
class Assignment(BaseModel):
    batch_id: int
    subject_id: int
    timeslot_id: int
    room_code: str
    teacher_id: int


class TimetableResponse(BaseModel):
    status: str
    assignments: List[Assignment]
    time_taken: float
    message: Optional[str] = None

class ClassroomCreate(BaseModel):
    room_code: str
    classroom_type: str
    