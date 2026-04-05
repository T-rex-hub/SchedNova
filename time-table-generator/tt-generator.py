#!/usr/bin/env python3
"""
Timetable Generator using Google OR-Tools CP-SAT
Generates optimized timetables considering teacher availability,
room constraints, batch groups, and multi-period sessions.
"""

from ortools.sat.python import cp_model
import time
import sys
import os
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
from contextlib import contextmanager

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import SessionLocal
from backend import models
from sqlalchemy.orm import Session


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class TimetableConfig:
    """Configuration for timetable generation"""
    slots_per_day: int = 7
    days_per_week: int = 5
    max_solve_time: int = 60  # seconds
    num_workers: int = 8

    @property
    def total_timeslots(self) -> int:
        return self.slots_per_day * self.days_per_week


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class Teacher:
    name: str
    subjects: List[str]
    available_shifts: List[int]

@dataclass
class Subject:
    name: str
    teachers: List[str]
    room_type: str
    per_week: int
    duration: int

@dataclass
class Room:
    code: str
    room_type: str


# =============================================================================
# DATABASE LOADER
# =============================================================================

class TimetableDataLoader:
    """Loads timetable data from database with proper error handling"""

    def __init__(self, db: Session):
        self.db = db
        self.config = TimetableConfig()

    def load_all(self) -> Tuple[List[str], Dict[str, Room], Dict[str, Subject],
                               Dict[str, Teacher], Dict[str, List[str]],
                               Dict[str, List[Tuple]]]:
        """
        Load all data needed for timetable generation.
        Returns: (batches, rooms, subjects, teachers, batch_subjects, fixed_groups)
        """
        print("Loading data from database...")
        start = time.time()

        batches = self._load_batches()
        rooms = self._load_rooms()
        subjects = self._load_subjects()
        teachers = self._load_teachers(subjects)
        batch_subjects = self._load_batch_subjects()
        fixed_groups = self._load_fixed_groups(subjects)

        elapsed = time.time() - start
        print(f"Data loaded in {elapsed:.2f}s")
        print(f"  - {len(batches)} batches")
        print(f"  - {len(rooms)} rooms")
        print(f"  - {len(subjects)} subjects")
        print(f"  - {len(teachers)} teachers")
        print(f"  - {len(fixed_groups)} subject groups")

        return batches, rooms, subjects, teachers, batch_subjects, fixed_groups

    def _load_batches(self) -> List[str]:
        """Load all batch names"""
        db_batches = self.db.query(models.Batch).all()
        return [b.batch_name for b in db_batches]

    def _load_rooms(self) -> Dict[str, Room]:
        """Load all rooms"""
        rooms = {}
        db_rooms = self.db.query(models.Classroom).all()
        for r in db_rooms:
            rooms[r.room_code] = Room(code=r.room_code, room_type=r.classroom_type)
        return rooms

    def _load_subjects(self) -> Dict[str, Subject]:
        """Load subjects with their room types and frequencies"""
        subjects = {}

        # Initialize subjects
        db_subjects = self.db.query(models.Subject).all()
        for s in db_subjects:
            subjects[s.subject_name] = Subject(
                name=s.subject_name,
                teachers=[],
                room_type=None,
                per_week=None,
                duration=s.duration
            )

        # Load room types and classes per week
        db_room_types = self.db.query(models.SubjectRoomType).all()
        for rt in db_room_types:
            subject = self.db.query(models.Subject).filter(
                models.Subject.subject_id == rt.subject_id
            ).first()
            if subject and subject.subject_name in subjects:
                subjects[subject.subject_name].room_type = rt.room_type
                subjects[subject.subject_name].per_week = rt.classes_per_week

        return subjects

    def _load_teachers(self, subjects: Dict[str, Subject]) -> Dict[str, Teacher]:
        """Load teachers and their subject mappings"""
        teachers = {}

        db_teachers = self.db.query(models.Teacher).all()
        for t in db_teachers:
            # Parse availability - default to all slots if not set
            availability = t.availability_time_slots
            if availability is None:
                availability = list(range(self.config.total_timeslots))
            elif isinstance(availability, dict):
                # Handle day-based availability format
                availability = self._convert_availability_to_slots(availability)
            elif not isinstance(availability, list):
                availability = list(range(self.config.total_timeslots))

            teachers[t.teacher_name] = Teacher(
                name=t.teacher_name,
                subjects=[],
                available_shifts=availability
            )

        # Load teacher-subject mappings
        db_teacher_subjects = self.db.query(models.TeacherSubject).all()
        for ts in db_teacher_subjects:
            teacher = self.db.query(models.Teacher).filter(
                models.Teacher.teacher_id == ts.teacher_id
            ).first()
            subject = self.db.query(models.Subject).filter(
                models.Subject.subject_id == ts.subject_id
            ).first()

            if teacher and subject:
                if teacher.teacher_name in teachers:
                    teachers[teacher.teacher_name].subjects.append(subject.subject_name)
                if subject.subject_name in subjects:
                    subjects[subject.subject_name].teachers.append(teacher.teacher_name)

        return teachers

    def _convert_availability_to_slots(self, availability: dict) -> List[int]:
        """Convert day-based availability to slot indices"""
        # TODO: Implement proper time range parsing if needed
        # For now, return all slots as default
        return list(range(self.config.total_timeslots))

    def _load_batch_subjects(self) -> Dict[str, List[str]]:
        """Load which subjects each batch takes"""
        batch_subjects = {}

        db_batch_subjects = self.db.query(models.BatchSubject).all()
        for bs in db_batch_subjects:
            batch = self.db.query(models.Batch).filter(
                models.Batch.batch_id == bs.batch_id
            ).first()
            subject = self.db.query(models.Subject).filter(
                models.Subject.subject_id == bs.subject_id
            ).first()

            if batch and subject:
                if batch.batch_name not in batch_subjects:
                    batch_subjects[batch.batch_name] = []
                batch_subjects[batch.batch_name].append(subject.subject_name)

        return batch_subjects

    def _load_fixed_groups(self, subjects: Dict[str, Subject]) -> Dict[str, List[Tuple]]:
        """Load fixed groups (batches that share classes)"""
        fixed_groups = {}

        db_groups = self.db.query(models.FixedGroup).all()
        for g in db_groups:
            group_batches = self.db.query(models.FixedGroupBatch).filter(
                models.FixedGroupBatch.group_id == g.group_id
            ).all()

            batch_names = []
            for gb in group_batches:
                batch = self.db.query(models.Batch).filter(
                    models.Batch.batch_id == gb.batch_id
                ).first()
                if batch:
                    batch_names.append(batch.batch_name)

            # Apply group only to subjects matching room types
            for subject_name, subject_data in subjects.items():
                if subject_data.room_type in g.room_types:
                    if subject_name not in fixed_groups:
                        fixed_groups[subject_name] = []
                    fixed_groups[subject_name].append(tuple(batch_names))

        return fixed_groups


# =============================================================================
# CONSTRAINT MODEL BUILDER
# =============================================================================

class ConstraintModelBuilder:
    """Builds OR-Tools CP-SAT model with all constraints"""

    def __init__(self, config: TimetableConfig):
        self.config = config
        self.model = cp_model.CpModel()

    def build(self, batches: List[str], rooms: Dict[str, Room],
              subjects: Dict[str, Subject], teachers: Dict[str, Teacher],
              batch_subjects: Dict[str, List[str]],
              fixed_groups: Dict[str, List[Tuple]]) -> Tuple[cp_model.CpModel, Dict]:
        """
        Build the constraint model.
        Returns: (model, variables_dict)
        """
        print("Building constraint model...")
        start = time.time()

        timeslots = list(range(self.config.total_timeslots))
        room_codes = list(rooms.keys())

        # Create variables
        x, group_x = self._create_occupancy_variables(
            batches, fixed_groups, timeslots, room_codes, subjects
        )

        start_x = self._create_start_variables(
            fixed_groups, timeslots, room_codes, subjects
        )

        # Add constraints
        self._add_session_count_constraints(start_x, fixed_groups, subjects,
                                           room_codes)
        self._add_start_linking_constraints(start_x, group_x, fixed_groups,
                                            subjects, timeslots, room_codes)
        self._add_teacher_availability_constraints(x, batches, batch_subjects,
                                                   timeslots, rooms, subjects, teachers)
        self._add_room_type_constraints(x, batches, batch_subjects, timeslots,
                                        rooms, subjects)
        self._add_no_clash_constraints(group_x, x, batches, fixed_groups, timeslots,
                                       room_codes, subjects, batch_subjects, teachers)
        self._add_teacher_assignment_constraints(group_x, fixed_groups, subjects,
                                                rooms, timeslots)

        # Create objective
        objective_terms = self._build_objective(group_x, fixed_groups, timeslots,
                                                room_codes, subjects, teachers, start_x)

        elapsed = time.time() - start
        print(f"Model built in {elapsed:.2f}s")
        print(f"  - {len(x)} batch-level variables")
        print(f"  - {len(group_x)} group-level variables")
        print(f"  - {len(start_x)} start variables")

        variables = {
            'x': x,
            'group_x': group_x,
            'start_x': start_x,
        }

        return self.model, variables

    def _create_occupancy_variables(self, batches, fixed_groups, timeslots,
                                    room_codes, subjects):
        """Create occupancy variables for each timeslot"""
        x = {}
        group_x = {}

        for subject_name in fixed_groups:
            for group in fixed_groups[subject_name]:
                for t in timeslots:
                    for r in room_codes:
                        for teacher in subjects[subject_name].teachers:
                            var_name = f"group_x_{group}_{subject_name}_{t}_{r}_{teacher}"
                            group_x[group, subject_name, t, r, teacher] = \
                                self.model.NewBoolVar(var_name)

                            for batch in group:
                                x[batch, subject_name, t, r, teacher] = \
                                    group_x[group, subject_name, t, r, teacher]

        return x, group_x

    def _create_start_variables(self, fixed_groups, timeslots, room_codes, subjects):
        """Create variables for when multi-period sessions start"""
        start_x = {}

        for subject_name in fixed_groups:
            duration = subjects[subject_name].duration
            for group in fixed_groups[subject_name]:
                for t in timeslots:
                    slot_in_day = t % self.config.slots_per_day
                    if slot_in_day <= self.config.slots_per_day - duration:
                        for r in room_codes:
                            for teacher in subjects[subject_name].teachers:
                                var_name = f"start_{group}_{subject_name}_{t}_{r}_{teacher}"
                                start_x[group, subject_name, t, r, teacher] = \
                                    self.model.NewBoolVar(var_name)

        return start_x

    def _add_session_count_constraints(self, start_x, fixed_groups, subjects, room_codes):
        """Each subject must be taught required number of times per week"""
        timeslots = list(range(self.config.total_timeslots))

        for subject_name in fixed_groups:
            per_week = subjects[subject_name].per_week
            for group in fixed_groups[subject_name]:
                self.model.Add(
                    sum(
                        start_x[group, subject_name, t, r, teacher]
                        for t in timeslots
                        for r in room_codes
                        for teacher in subjects[subject_name].teachers
                        if (group, subject_name, t, r, teacher) in start_x
                    ) == per_week
                )

    def _add_start_linking_constraints(self, start_x, group_x, fixed_groups,
                                        subjects, timeslots, room_codes):
        """Link start variables to occupancy variables"""
        for subject_name in fixed_groups:
            duration = subjects[subject_name].duration
            for group in fixed_groups[subject_name]:
                for r in room_codes:
                    for teacher in subjects[subject_name].teachers:
                        # Start implies occupancy for duration
                        for t0 in timeslots:
                            if (group, subject_name, t0, r, teacher) not in start_x:
                                continue
                            for k in range(duration):
                                t = t0 + k
                                if (group, subject_name, t, r, teacher) in group_x:
                                    self.model.Add(
                                        start_x[group, subject_name, t0, r, teacher] <=
                                        group_x[group, subject_name, t, r, teacher]
                                    )

                        # Occupancy equals sum of covering starts
                        for u in timeslots:
                            covering_starts = []
                            for k in range(duration):
                                t0 = u - k
                                if t0 < 0:
                                    continue
                                if (t0 // self.config.slots_per_day) == (u // self.config.slots_per_day):
                                    if (group, subject_name, t0, r, teacher) in start_x:
                                        covering_starts.append(
                                            start_x[group, subject_name, t0, r, teacher]
                                        )

                            if covering_starts:
                                self.model.Add(
                                    group_x[group, subject_name, u, r, teacher] ==
                                    sum(covering_starts)
                                )
                            elif (group, subject_name, u, r, teacher) in group_x:
                                self.model.Add(
                                    group_x[group, subject_name, u, r, teacher] == 0
                                )

    def _add_teacher_availability_constraints(self, x, batches, batch_subjects,
                                               timeslots, rooms, subjects, teachers):
        """Teachers can only teach during available shifts"""
        for batch in batches:
            if batch not in batch_subjects:
                continue
            for subject_name in batch_subjects[batch]:
                for t in timeslots:
                    for r in rooms:
                        for teacher in subjects[subject_name].teachers:
                            if t not in teachers[teacher].available_shifts:
                                if (batch, subject_name, t, r, teacher) in x:
                                    self.model.Add(
                                        x[batch, subject_name, t, r, teacher] == 0
                                    )

    def _add_room_type_constraints(self, x, batches, batch_subjects, timeslots,
                                   rooms, subjects):
        """Subjects must be taught in matching room types"""
        for batch in batches:
            if batch not in batch_subjects:
                continue
            for subject_name in batch_subjects[batch]:
                for t in timeslots:
                    for r, room in rooms.items():
                        for teacher in subjects[subject_name].teachers:
                            if room.room_type != subjects[subject_name].room_type:
                                if (batch, subject_name, t, r, teacher) in x:
                                    self.model.Add(
                                        x[batch, subject_name, t, r, teacher] == 0
                                    )

    def _add_no_clash_constraints(self, group_x, x, batches, fixed_groups,
                                   timeslots, room_codes, subjects, batch_subjects, teachers):
        """No teacher, room, or batch conflicts"""

        # No teacher clash
        for teacher in teachers:
            for t in timeslots:
                self.model.Add(
                    sum(
                        group_x[group, subject_name, t, r, teacher]
                        for subject_name in fixed_groups
                        for group in fixed_groups[subject_name]
                        for r in room_codes
                        if teacher in subjects[subject_name].teachers
                    ) <= 1
                )

        # No room clash
        for r in room_codes:
            for t in timeslots:
                self.model.Add(
                    sum(
                        group_x[group, subject_name, t, r, teacher]
                        for subject_name in fixed_groups
                        for group in fixed_groups[subject_name]
                        for teacher in subjects[subject_name].teachers
                    ) <= 1
                )

        # No batch clash
        for batch in batches:
            for t in timeslots:
                if batch not in batch_subjects:
                    continue
                self.model.Add(
                    sum(
                        x[batch, subject_name, t, r, teacher]
                        for subject_name in batch_subjects[batch]
                        for r in room_codes
                        for teacher in subjects[subject_name].teachers
                        if (batch, subject_name, t, r, teacher) in x
                    ) <= 1
                )

    def _add_teacher_assignment_constraints(self, group_x, fixed_groups, subjects,
                                           rooms, timeslots):
        """Ensure one teacher per group-subject"""
        y = {}

        for subject_name in fixed_groups:
            for group in fixed_groups[subject_name]:
                for teacher in subjects[subject_name].teachers:
                    y[group, subject_name, teacher] = self.model.NewBoolVar(
                        f"y_{group}_{subject_name}_{teacher}"
                    )

                # Exactly one teacher per group-subject
                self.model.Add(
                    sum(y[group, subject_name, teacher]
                        for teacher in subjects[subject_name].teachers) == 1
                )

                # Link occupancy to chosen teacher
                for t in timeslots:
                    for r in rooms:
                        for teacher in subjects[subject_name].teachers:
                            self.model.Add(
                                group_x[group, subject_name, t, r, teacher] <=
                                y[group, subject_name, teacher]
                            )

    def _build_objective(self, group_x, fixed_groups, timeslots, room_codes,
                         subjects, teachers, start_x):
        """Build multi-objective optimization function"""

        # Teacher load balancing
        teacher_load = {}
        max_load_ub = len(timeslots)

        for teacher in teachers:
            teacher_load[teacher] = self.model.NewIntVar(
                0, max_load_ub, f"teacher_load_{teacher}"
            )
            self.model.Add(
                teacher_load[teacher] == sum(
                    group_x[group, subject_name, t, r, teacher]
                    for subject_name in fixed_groups
                    for group in fixed_groups[subject_name]
                    for r in room_codes
                    for t in timeslots
                    if teacher in subjects[subject_name].teachers
                )
            )

        teacher_max = self.model.NewIntVar(0, max_load_ub, "teacher_max")
        self.model.AddMaxEquality(teacher_max, list(teacher_load.values()))

        # Room utilization
        total_occupied = self.model.NewIntVar(
            0, len(room_codes) * len(timeslots), "total_occupied"
        )
        self.model.Add(
            total_occupied == sum(
                group_x[group, subject_name, t, r, teacher]
                for subject_name in fixed_groups
                for group in fixed_groups[subject_name]
                for r in room_codes
                for t in timeslots
                for teacher in subjects[subject_name].teachers
            )
        )

        total_slots = len(room_codes) * len(timeslots)
        unused_slots = self.model.NewIntVar(0, total_slots, "unused_slots")
        self.model.Add(unused_slots == total_slots - total_occupied)

        # Minimize same-subject-same-day occurrences
        extra_same_day = {}
        days = self.config.days_per_week

        for subject_name in fixed_groups:
            duration = subjects[subject_name].duration
            for group in fixed_groups[subject_name]:
                for day in range(days):
                    ds_var = self.model.NewIntVar(
                        0, self.config.slots_per_day,
                        f"day_sessions_{group}_{subject_name}_d{day}"
                    )
                    starts_in_day = []

                    for t in range(day * self.config.slots_per_day,
                                   (day + 1) * self.config.slots_per_day):
                        for r in room_codes:
                            for teacher in subjects[subject_name].teachers:
                                if (group, subject_name, t, r, teacher) in start_x:
                                    starts_in_day.append(
                                        start_x[group, subject_name, t, r, teacher]
                                    )

                    if starts_in_day:
                        self.model.Add(ds_var == sum(starts_in_day))
                    else:
                        self.model.Add(ds_var == 0)

                    extra = self.model.NewIntVar(
                        0, self.config.slots_per_day,
                        f"extra_{group}_{subject_name}_d{day}"
                    )
                    self.model.Add(extra >= ds_var - 1)
                    self.model.Add(extra >= 0)
                    extra_same_day[group, subject_name, day] = extra

        total_extra = self.model.NewIntVar(
            0, days * len(fixed_groups) * self.config.slots_per_day,
            "total_extra_same_day"
        )
        self.model.Add(total_extra == sum(extra_same_day.values()))

        # Weighted objective
        w_max_load = 1000
        w_extra = 200
        w_unused = 1

        self.model.Minimize(
            teacher_max * w_max_load +
            unused_slots * w_unused +
            total_extra * w_extra
        )


# =============================================================================
# SOLUTION PRINTER
# =============================================================================

class SolutionPrinter:
    """Prints and formats timetable solutions"""

    def __init__(self, config: TimetableConfig):
        self.config = config
        self.days = ["Mon", "Tue", "Wed", "Thu", "Fri"]

    def print_schedule(self, solver, x, batches, batch_subjects, timeslots,
                       rooms, subjects):
        """Print the final schedule in readable format"""
        print("\n" + "="*70)
        print("GENERATED TIMETABLE")
        print("="*70)

        for batch in batches:
            if batch not in batch_subjects:
                continue

            print(f"\n{batch}:")
            print("-" * 40)

            for subject_name in batch_subjects[batch]:
                for t in timeslots:
                    for r in rooms:
                        for teacher in subjects[subject_name].teachers:
                            if (batch, subject_name, t, r, teacher) in x:
                                if solver.Value(x[batch, subject_name, t, r, teacher]) == 1:
                                    day = t // self.config.slots_per_day
                                    slot = t % self.config.slots_per_day
                                    print(f"  {subject_name} on {self.days[day]} "
                                          f"slot {slot+1} in {r} with {teacher}")

    def export_to_json(self, solver, x, batch_subjects, timeslots,
                       rooms, subjects, filename="timetable.json"):
        """Export schedule to JSON for frontend consumption"""
        import json

        schedule = []
        for batch in batches:
            if batch not in batch_subjects:
                continue
            for subject_name in batch_subjects[batch]:
                for t in timeslots:
                    for r in rooms:
                        for teacher in subjects[subject_name].teachers:
                            if (batch, subject_name, t, r, teacher) in x:
                                if solver.Value(x[batch, subject_name, t, r, teacher]) == 1:
                                    schedule.append({
                                        "batch": batch,
                                        "subject": subject_name,
                                        "day": t // self.config.slots_per_day,
                                        "slot": t % self.config.slots_per_day,
                                        "room": r,
                                        "teacher": teacher
                                    })

        with open(filename, 'w') as f:
            json.dump(schedule, f, indent=2)

        print(f"\nSchedule exported to {filename}")


# =============================================================================
# MAIN SOLVER
# =============================================================================

class TimetableSolver:
    """Main solver class that orchestrates the timetable generation"""

    def __init__(self, config: Optional[TimetableConfig] = None):
        self.config = config or TimetableConfig()
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = self.config.max_solve_time
        self.solver.parameters.num_search_workers = self.config.num_workers

    def solve(self, model, variables):
        """Run the solver and return status"""
        print(f"\nSolving (max {self.config.max_solve_time}s)...")
        start = time.time()

        status = self.solver.Solve(model)

        elapsed = time.time() - start
        print(f"Solved in {elapsed:.2f}s")

        return status, elapsed

    def is_feasible(self, status):
        """Check if solution was found"""
        return status in (cp_model.OPTIMAL, cp_model.FEASIBLE)


# =============================================================================
# DATABASE CONTEXT MANAGER
# =============================================================================

@contextmanager
def get_db_session():
    """Context manager for database sessions"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        print(f"Database error: {e}")
        raise
    finally:
        db.close()


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def main():
    """Main function - generates timetable"""
    total_start = time.time()

    try:
        with get_db_session() as db:
            # Load data
            loader = TimetableDataLoader(db)
            batches, rooms, subjects, teachers, batch_subjects, fixed_groups = \
                loader.load_all()

            # Validate data
            if not batches:
                print("ERROR: No batches found in database!")
                return
            if not fixed_groups:
                print("ERROR: No fixed groups found! Check FixedGroup and FixedGroupBatch tables.")
                return
            if not rooms:
                print("ERROR: No rooms found in database!")
                return

            # Build model
            config = TimetableConfig()
            builder = ConstraintModelBuilder(config)
            model, variables = builder.build(
                batches, rooms, subjects, teachers, batch_subjects, fixed_groups
            )

            # Solve
            solver = TimetableSolver(config)
            status, _ = solver.solve(model, variables)

            # Output results
            if solver.is_feasible(status):
                status_str = "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"
                print(f"\n✓ Solution found ({status_str})!")

                printer = SolutionPrinter(config)
                printer.print_schedule(
                    solver.solver, variables['x'], batches, batch_subjects,
                    list(range(config.total_timeslots)),
                    list(rooms.keys()), subjects
                )

                # Export for frontend
                printer.export_to_json(
                    solver.solver, variables['x'], batch_subjects,
                    list(range(config.total_timeslots)),
                    list(rooms.keys()), subjects
                )
            else:
                print("\n✗ No feasible solution found!")
                print("  This may be due to:")
                print("  - Insufficient room capacity")
                print("  - Teacher availability conflicts")
                print("  - Too many classes scheduled per week")
                print("  - Duration constraints cannot be satisfied")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

    total_time = time.time() - total_start
    print(f"\nTotal execution time: {total_time:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
