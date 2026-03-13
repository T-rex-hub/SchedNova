# backend/timetable_solver.py
from ortools.sat.python import cp_model
import time

def solve_timetable(request_data):
    """
    request_data is of type schemas.RequestData
    Example fields:
    - request_data.batches
    - request_data.timeslots
    - request_data.rooms
    - request_data.teachers
    - request_data.subjects
    - request_data.batch_subjects
    - request_data.fixed_groups
    """

    model = cp_model.CpModel()
    start_time = time.time()

    # Extract from request
    batches = request_data.batches
    timeslots = request_data.timeslots
    rooms = request_data.rooms
    teachers = request_data.teachers
    subjects = request_data.subjects
    batch_subjects = request_data.batch_subjects
    fixed_groups = request_data.fixed_groups

    slots_per_day = 7   # TODO: store in DB later
    days = 5

    # Variables
    x = {}
    group_x = {}
    start_x = {}

    # Group-level variables
    for s in fixed_groups:
        for group in fixed_groups[s]:
            for t in timeslots:
                for r in rooms:
                    for teacher in subjects[s]["teachers"]:
                        group_x[group, s, t, r, teacher] = model.NewBoolVar(
                            f"group_x_{group}{s}{t}{r}{teacher}"
                        )
                        for b in group:
                            x[b, s, t, r, teacher] = group_x[group, s, t, r, teacher]

    # Start variables for multi-period sessions
    for s in fixed_groups:
        duration = subjects[s].get("duration", 1)
        for group in fixed_groups[s]:
            for t in timeslots:
                slot_in_day = t % slots_per_day
                if slot_in_day <= slots_per_day - duration:
                    for r in rooms:
                        for teacher in subjects[s]["teachers"]:
                            start_x[group, s, t, r, teacher] = model.NewBoolVar(
                                f"start_{group}{s}{t}{r}{teacher}"
                            )

    # Constraints: subject per week
    for s in fixed_groups:
        per_week = subjects[s]["per_week"]
        for group in fixed_groups[s]:
            model.Add(
                sum(
                    start_x[group, s, t, r, teacher]
                    for t in timeslots
                    for r in rooms
                    for teacher in subjects[s]["teachers"]
                    if (group, s, t, r, teacher) in start_x
                ) == per_week
            )

    # Link start_x to group_x occupancy
    for s in fixed_groups:
        duration = subjects[s].get("duration", 1)
        for group in fixed_groups[s]:
            for r in rooms:
                for teacher in subjects[s]["teachers"]:
                    for t0 in timeslots:
                        if (group, s, t0, r, teacher) not in start_x:
                            continue
                        for k in range(duration):
                            t = t0 + k
                            model.Add(start_x[group, s, t0, r, teacher] <= group_x[group, s, t, r, teacher])

    # Teacher availability
    for b in batches:
        for s in batch_subjects[b]:
            for t in timeslots:
                for r in rooms:
                    for teacher in subjects[s]["teachers"]:
                        if t not in teachers[teacher]["available_shifts"]:
                            model.Add(x[b, s, t, r, teacher] == 0)

    # Room type constraint
    for b in batches:
        for s in batch_subjects[b]:
            for t in timeslots:
                for r, r_type in rooms.items():
                    for teacher in subjects[s]["teachers"]:
                        if r_type != subjects[s]["room_type"]:
                            model.Add(x[b, s, t, r, teacher] == 0)

    # No teacher clash
    for teacher in teachers:
        for t in timeslots:
            model.Add(
                sum(
                    group_x[group, s, t, r, teacher]
                    for s in fixed_groups
                    for group in fixed_groups[s]
                    for r in rooms
                    if teacher in subjects[s]["teachers"]
                ) <= 1
            )

    # No room clash
    for r in rooms:
        for t in timeslots:
            model.Add(
                sum(
                    group_x[group, s, t, r, teacher]
                    for s in fixed_groups
                    for group in fixed_groups[s]
                    for teacher in subjects[s]["teachers"]
                ) <= 1
            )

    # No batch clash
    for b in batches:
        for t in timeslots:
            model.Add(
                sum(
                    x[b, s, t, r, teacher]
                    for s in batch_subjects[b]
                    for r in rooms
                    for teacher in subjects[s]["teachers"]
                ) <= 1
            )

    # Objective: balance teacher loads, maximize room use, avoid duplicate same-day subjects
    # (shortened here for clarity)
    # TODO: Add the same teacher load, unused room, and extra_same_day constraints as in your current code

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)

    result = {
        "status": "NO_SOLUTION",
        "schedule": []
    }

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        schedule = []
        for b in batches:
            for s in batch_subjects[b]:
                for t in timeslots:
                    for r in rooms:
                        for teacher in subjects[s]["teachers"]:
                            if solver.Value(x[b, s, t, r, teacher]) == 1:
                                schedule.append({
                                    "batch": b,
                                    "subject": s,
                                    "timeslot": t,
                                    "room": r,
                                    "teacher": teacher
                                })
        result["status"] = "OK"
        result["schedule"] = schedule

    result["solve_time"] = time.time() - start_time
    return result
