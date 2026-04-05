"""
Run: python3 -m backend.timetable_smoke_tests
Smoke tests for CP-SAT solver (no DB). Ensures no exceptions and basic feasibility.
"""
from backend.timetable_solver import solve_timetable
from backend import schemas


def _solve(d: dict):
    req = schemas.RequestData.model_validate(d)
    return solve_timetable(req)


def test_minimal_ok():
    d = {
        "user_id": "u1",
        "batches": [1],
        "timeslots": list(range(10)),
        "rooms": {"R1": "Classroom"},
        "teachers": {
            1: {
                "teacher_name": "T1",
                "subjects": [10],
                "available_shifts": list(range(10)),
            }
        },
        "subjects": {
            10: {
                "subject_name": "S",
                "course_code": "S1",
                "teachers": [1],
                "room_type": "Classroom",
                "per_week": 2,
                "duration": 1,
            }
        },
        "batch_subjects": {1: {10: 2}},
        "fixed_groups": {10: [[1]]},
        "slots_per_day": 5,
        "num_days": 2,
    }
    out = _solve(d)
    assert out["status"] == "OK", out
    assert len(out["schedule"]) == 2


def test_duration_two_partial_week_no_crash():
    """7 slots (e.g. Mon–Fri + 2), duration 2 must not KeyError."""
    d = {
        "user_id": "u1",
        "batches": [1],
        "timeslots": list(range(7)),
        "rooms": {"R1": "Lab"},
        "teachers": {
            1: {
                "teacher_name": "T1",
                "subjects": [10],
                "available_shifts": list(range(7)),
            }
        },
        "subjects": {
            10: {
                "subject_name": "Lab",
                "course_code": "L1",
                "teachers": [1],
                "room_type": "Lab",
                "per_week": 2,
                "duration": 2,
            }
        },
        "batch_subjects": {1: {10: 2}},
        "fixed_groups": {10: [[1]]},
        "slots_per_day": 5,
        "num_days": 2,
    }
    out = _solve(d)
    assert out["status"] in ("OK", "NO_SOLUTION")


def test_joint_batch_group_same_slot():
    """Batches 1 and 2 share subject 10 in one fixed group → same timeslot."""
    d = {
        "user_id": "u1",
        "batches": [1, 2],
        "timeslots": list(range(8)),
        "rooms": {"R1": "Classroom"},
        "teachers": {
            1: {
                "teacher_name": "T1",
                "subjects": [10],
                "available_shifts": list(range(8)),
            }
        },
        "subjects": {
            10: {
                "subject_name": "Shared",
                "course_code": "SH",
                "teachers": [1],
                "room_type": "Classroom",
                "per_week": 2,
                "duration": 1,
            }
        },
        "batch_subjects": {1: {10: 2}, 2: {10: 2}},
        "fixed_groups": {10: [[1, 2]]},
        "slots_per_day": 4,
        "num_days": 2,
    }
    out = _solve(d)
    assert out["status"] == "OK", out
    by_batch = {1: [], 2: []}
    for row in out["schedule"]:
        by_batch[row["batch"]].append((row["timeslot"], row["room"], row["teacher"]))
    assert len(by_batch[1]) == 2 and len(by_batch[2]) == 2
    assert set(by_batch[1]) == set(by_batch[2]), "joint group must share slots"


def test_empty_rooms_safe():
    d = {
        "user_id": "u1",
        "batches": [1],
        "timeslots": [0],
        "rooms": {},
        "teachers": {
            1: {
                "teacher_name": "T1",
                "subjects": [10],
                "available_shifts": [0],
            }
        },
        "subjects": {
            10: {
                "subject_name": "S",
                "course_code": "S1",
                "teachers": [1],
                "room_type": "Classroom",
                "per_week": 1,
                "duration": 1,
            }
        },
        "batch_subjects": {1: {10: 1}},
        "fixed_groups": {10: [[1]]},
        "slots_per_day": 1,
        "num_days": 1,
    }
    out = _solve(d)
    assert out["status"] == "NO_SOLUTION"


if __name__ == "__main__":
    test_minimal_ok()
    test_duration_two_partial_week_no_crash()
    test_joint_batch_group_same_slot()
    test_empty_rooms_safe()
    print("timetable_smoke_tests: all passed")
