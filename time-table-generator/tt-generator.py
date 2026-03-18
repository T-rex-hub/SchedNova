from ortools.sat.python import cp_model
import time

from backend.database import SessionLocal
from backend import models

t_start_time = time.time()

model = cp_model.CpModel()

# --- LOAD DATA FROM DATABASE ---
db = SessionLocal()

# Batches
db_batches = db.query(models.Batch).all()
batches = [b.batch_name for b in db_batches]

# Rooms
rooms = {}
db_rooms = db.query(models.Classroom).all()
for r in db_rooms:
    rooms[r.room_code] = r.classroom_type

# Subjects
subjects = {}
db_subjects = db.query(models.Subject).all()
for s in db_subjects:
    subjects[s.subject_name] = {
        "teachers": [],  # fill later
        "room_type": None,  # from subject_room_types
        "per_week": None,
        "duration": s.duration
    }

# Subject Room Types (for room_type + classes_per_week)
db_room_types = db.query(models.SubjectRoomType).all()
for rt in db_room_types:
    subject = db.query(models.Subject).filter(models.Subject.subject_id == rt.subject_id).first()
    if subject:
        subjects[subject.subject_name]["room_type"] = rt.room_type
        subjects[subject.subject_name]["per_week"] = rt.classes_per_week

# Teachers + mapping
teachers = {}
db_teachers = db.query(models.Teacher).all()
for t in db_teachers:
    teachers[t.teacher_name] = {
        "subjects": [],
        "available_shifts": list(range(35))  # TODO: replace with real availability
    }

# Teacher-Subject mapping
db_teacher_subjects = db.query(models.TeacherSubject).all()
for ts in db_teacher_subjects:
    teacher = db.query(models.Teacher).filter(models.Teacher.teacher_id == ts.teacher_id).first()
    subject = db.query(models.Subject).filter(models.Subject.subject_id == ts.subject_id).first()
    if teacher and subject:
        teachers[teacher.teacher_name]["subjects"].append(subject.subject_name)
        subjects[subject.subject_name]["teachers"].append(teacher.teacher_name)

# Batch Subjects
batch_subjects = {}
db_batch_subjects = db.query(models.BatchSubject).all()
for bs in db_batch_subjects:
    batch = db.query(models.Batch).filter(models.Batch.batch_id == bs.batch_id).first()
    subject = db.query(models.Subject).filter(models.Subject.subject_id == bs.subject_id).first()
    if batch and subject:
        batch_subjects.setdefault(batch.batch_name, []).append(subject.subject_name)

# Fixed Groups
fixed_groups = {}
db_groups = db.query(models.FixedGroup).all()
for g in db_groups:
    group_batches = db.query(models.FixedGroupBatch).filter(models.FixedGroupBatch.group_id == g.group_id).all()
    batch_names = []
    for gb in group_batches:
        batch = db.query(models.Batch).filter(models.Batch.batch_id == gb.batch_id).first()
        if batch:
            batch_names.append(batch.batch_name)

    for subject_name in subjects:
        fixed_groups.setdefault(subject_name, []).append(tuple(batch_names))

slots_per_day = 7
days = 5
timeslots = list(range(days * slots_per_day))  # 5 days * 7 slots/day

# Variables
# Occupancy variables at each timeslot (as in the original model), at the group level.
x = {}
group_x = {}

for s in fixed_groups:
    for group in fixed_groups[s]:
        for t in timeslots:
            for r in rooms:
                for teacher in subjects[s]["teachers"]:
                    group_x[group, s, t, r, teacher] = model.NewBoolVar(f"group_x_{group}{s}{t}{r}{teacher}")
                    for b in group:
                        x[b, s, t, r, teacher] = group_x[group, s, t, r, teacher]  # Link to batch occupancy

# Start variables for multi-period sessions
# start_x[group, s, t, r, teacher] == 1 means a session of subject s for this group starts at t
start_x = {}
for s in fixed_groups:
    duration = subjects[s]["duration"]
    for group in fixed_groups[s]:
        for t in timeslots:
            # Only allow starts that stay within the same day
            slot_in_day = t % slots_per_day
            if slot_in_day <= slots_per_day - duration:
                for r in rooms:
                    for teacher in subjects[s]["teachers"]:
                        start_x[group, s, t, r, teacher] = model.NewBoolVar(f"start_{group}{s}{t}{r}{teacher}")

# Each subject must be assigned required number of times per group, counting only valid starts
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

# Link start variables to occupancy variables to enforce consecutive in-day blocks
for s in fixed_groups:
    duration = subjects[s]["duration"]
    for group in fixed_groups[s]:
        for r in rooms:
            for teacher in subjects[s]["teachers"]:
                # Start implies occupancy for the d consecutive slots
                for t0 in timeslots:
                    if (group, s, t0, r, teacher) not in start_x:
                        continue
                    for k in range(duration):
                        t = t0 + k
                        model.Add(start_x[group, s, t0, r, teacher] <= group_x[group, s, t, r, teacher])

                # Occupancy at time u must be exactly the sum of starts that cover u
                for u in timeslots:
                    # Collect all starts t0 whose window covers u within the same day
                    covering_starts = []
                    for k in range(duration):
                        t0 = u - k
                        if t0 < 0:
                            continue
                        # same-day check and valid start existence
                        if (t0 // slots_per_day) == (u // slots_per_day) and (t0 % slots_per_day) <= slots_per_day - duration:
                            if (group, s, t0, r, teacher) in start_x:
                                covering_starts.append(start_x[group, s, t0, r, teacher])
                    if covering_starts:
                        model.Add(group_x[group, s, u, r, teacher] == sum(covering_starts))
                    else:
                        # No valid start could cover u for this duration => occupancy must be 0
                        model.Add(group_x[group, s, u, r, teacher] == 0)

# Teacher availability constraint: if teacher unavailable at t, no occupancy at t
for b in batches:
    for s in batch_subjects[b]:
        for t in timeslots:
            for r in rooms:
                for teacher in subjects[s]["teachers"]:
                    if t not in teachers[teacher]["available_shifts"]:
                        model.Add(x[b, s, t, r, teacher] == 0)

# Room type constraint: only allow matching room types
for b in batches:
    for s in batch_subjects[b]:
        for t in timeslots:
            for r, r_type in rooms.items():
                for teacher in subjects[s]["teachers"]:
                    if r_type != subjects[s]["room_type"]:
                        model.Add(x[b, s, t, r, teacher] == 0)

# No teacher can be in two places at once
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

# No room clash (same room, same time)
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

# No batch can have two classes at once
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

# Auxiliary variables: Which teacher teaches subject s for a batch/group
y = {}
for s in fixed_groups:
    for group in fixed_groups[s]:
        for teacher in subjects[s]["teachers"]:
            y[group, s, teacher] = model.NewBoolVar(f"y_{group}{s}{teacher}")

# Exactly one teacher per group-subject
for s in fixed_groups:
    for group in fixed_groups[s]:
        model.Add(
            sum(y[group, s, teacher] for teacher in subjects[s]["teachers"]) == 1
        )

# Link occupancy to chosen teacher
for s in fixed_groups:
    for group in fixed_groups[s]:
        for t in timeslots:
            for r in rooms:
                for teacher in subjects[s]["teachers"]:
                    model.Add(group_x[group, s, t, r, teacher] <= y[group, s, teacher])




# --- 1) Teacher load variables (total number of timeslots teacher is scheduled) ---
teacher_load = {}
max_load_ub = len(timeslots)  # teacher cannot teach more than one slot per timeslot due to constraints
for teacher in teachers:
    teacher_load[teacher] = model.NewIntVar(0, max_load_ub, f"teacher_load_{teacher}")
    # teacher_load == sum of group_x over all s,group,r,t for that teacher
    model.Add(
        teacher_load[teacher]
        == sum(
            group_x[group, s, t, r, teacher]
            for s in fixed_groups
            for group in fixed_groups[s]
            for r in rooms
            for t in timeslots
            if teacher in subjects[s]["teachers"]
        )
    )

# teacher_max to balance workloads (minimise the maximum load)
teacher_max = model.NewIntVar(0, max_load_ub, "teacher_max")
model.AddMaxEquality(teacher_max, [teacher_load[t] for t in teachers])

# --- 2) Room usage: count total occupied room-timeslots (group_x indicates a room occupied) ---
total_occupied = model.NewIntVar(0, len(rooms) * len(timeslots), "total_occupied")
model.Add(
    total_occupied
    == sum(
        group_x[group, s, t, r, teacher]
        for s in fixed_groups
        for group in fixed_groups[s]
        for r in rooms
        for t in timeslots
        for teacher in subjects[s]["teachers"]
    )
)
total_slots = len(rooms) * len(timeslots)
unused_slots = model.NewIntVar(0, total_slots, "unused_slots")
model.Add(unused_slots == total_slots - total_occupied)

# --- 3) Penalize teaching same subject multiple times in same day for a group ---
# day_sessions[group,s,day] = number of starts of (group,s) in that day
day_sessions = {}
extra_same_day = {}
for s in fixed_groups:
    duration = subjects[s]["duration"]
    for group in fixed_groups[s]:
        for day in range(days):
            # sum all starts within that day
            ds_var = model.NewIntVar(0, slots_per_day, f"day_sessions_{group}_{s}_d{day}")
            starts_in_day = []
            for t in range(day * slots_per_day, (day + 1) * slots_per_day):
                for r in rooms:
                    for teacher in subjects[s]["teachers"]:
                        if (group, s, t, r, teacher) in start_x:
                            starts_in_day.append(start_x[group, s, t, r, teacher])
            if starts_in_day:
                model.Add(ds_var == sum(starts_in_day))
            else:
                model.Add(ds_var == 0)
            day_sessions[group, s, day] = ds_var

            # extra = max(0, ds_var - 1)
            extra = model.NewIntVar(0, slots_per_day, f"extra_{group}_{s}_d{day}")
            model.Add(extra >= ds_var - 1)
            model.Add(extra >= 0)
            # upper bound
            model.Add(extra <= ds_var)  # safe upper bound
            extra_same_day[group, s, day] = extra

# Sum of extras across all group-subject-days
total_extra_same_day = model.NewIntVar(0, days * len(fixed_groups) * slots_per_day, "total_extra_same_day")
model.Add(total_extra_same_day == sum(extra_same_day[g, s, d] for (g, s, d) in extra_same_day))

# --- 4) Objective: weighted linear objective (minimize) ---
# We will minimize: w_max_load*teacher_max + w_unused*unused_slots + w_extra*total_extra_same_day
# (lower is better). Tune weights as needed.
w_max_load = 1000   # strong priority: balance teacher loads
w_extra = 200       # medium priority: avoid multiple sessions of same subject in same day
w_unused = 1        # low priority: prefer to fill rooms (minimise unused slots)

objective_terms = []
objective_terms.append(teacher_max * w_max_load)
objective_terms.append(unused_slots * w_unused)
objective_terms.append(total_extra_same_day * w_extra)

model.Minimize(sum(objective_terms))



start_time = time.time()
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 60
solver.parameters.num_search_workers = 8
status = solver.Solve(model)
end_time = time.time()

elapsed_time = end_time - start_time

print(f"\nTime taken to solve the timetable: {elapsed_time:.2f} seconds\n")

if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
    for b in batches:
        for s in batch_subjects[b]:
            for t in timeslots:
                for r in rooms:
                    for teacher in subjects[s]["teachers"]:
                        if solver.Value(x[b, s, t, r, teacher]) == 1:
                            print(f"{b} attends Subject {s} at Timeslot {t} in Room {r} with Teacher {teacher}")
        print('\n')
else:
    print('No feasible solution found.')

t_end_time = time.time()
print(f"\nTotal time taken to run the program: {t_end_time - t_start_time:.2f} seconds\n")



# Add teacher substitute feature
# Add boolean variables to check all the three and only constraint them when true:
# minimizing teacher workloads
# maximising room usage
# Avoid multiple sessions of same subject for a batch