from collections import defaultdict
import math
from sqlalchemy.orm import Session
from . import models
import json

DAY_ORDER = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}


def _norm_room_type(room_type: str) -> str:
    if room_type is None:
        return ""
    return str(room_type).strip().lower().replace(" ", "_")


def _norm_time_part(t: str) -> str:
    if not t:
        return ""
    t = str(t).strip()
    if ":" not in t:
        return t
    h, _, rest = t.partition(":")
    m = rest[:2] if rest else "00"
    try:
        return f"{int(h):02d}:{int(m):02d}"
    except ValueError:
        return t


def _slot_time_key(ts: models.Timeslot) -> str:
    return f"{_norm_time_part(ts.start_time)}-{_norm_time_part(ts.end_time)}"


def _availability_token_matches(token: str, ts: models.Timeslot) -> bool:
    s = str(token).strip().replace(" ", "")
    if "-" not in s:
        return False
    a, b = s.split("-", 1)
    return _norm_time_part(a) == _norm_time_part(ts.start_time) and _norm_time_part(
        b
    ) == _norm_time_part(ts.end_time)


def teacher_availability_indices(
    availability, ordered_slots: list[models.Timeslot]
) -> list[int]:
    """Map teacher availability (JSON from DB) to solver slot indices."""
    n = len(ordered_slots)
    if not n:
        return []

    if availability is None:
        return list(range(n))

    if isinstance(availability, str):
        try:
            availability = json.loads(availability)
        except Exception:
            return list(range(n))

    if isinstance(availability, list):
        if len(availability) == 0:
            return list(range(n))
        if all(isinstance(x, int) for x in availability):
            return sorted({i for i in availability if 0 <= i < n})
        id_map = {ts.timeslot_id: i for i, ts in enumerate(ordered_slots)}
        out = []
        for x in availability:
            try:
                xi = int(x)
            except (TypeError, ValueError):
                continue
            if xi in id_map:
                out.append(id_map[xi])
        return sorted(set(out)) if out else list(range(n))

    if isinstance(availability, dict):
        matched = []
        for i, ts in enumerate(ordered_slots):
            day = ts.day_of_week
            strings = availability.get(day)
            if strings is None:
                for k, v in availability.items():
                    if str(k).lower() == str(day).lower():
                        strings = v
                        break
            if not strings or not isinstance(strings, list):
                continue
            key = _slot_time_key(ts)
            compact_key = key.replace(" ", "")
            for token in strings:
                t = str(token).strip().replace(" ", "")
                if t == compact_key or _availability_token_matches(str(token), ts):
                    matched.append(i)
                    break
        return sorted(set(matched)) if matched else list(range(n))

    return list(range(n))


def _subject_defaults(db: Session, subject_id: int) -> tuple[str, int, int]:
    """Primary room_type, total classes/week, duration from Subject + SubjectRoomType."""
    s = db.query(models.Subject).filter_by(subject_id=subject_id).first()
    duration = s.duration if s and s.duration else 1
    rts = (
        db.query(models.SubjectRoomType)
        .filter_by(subject_id=subject_id)
        .all()
    )
    if not rts:
        return "Classroom", 3, duration
    room_type = rts[0].room_type
    # UI/DB `classes_per_week` is total periods; solver needs starts/sessions per week.
    total_periods_per_week = sum(rt.classes_per_week or 0 for rt in rts) or 3
    # Prefer max duration among room-type variants to avoid under-blocking.
    try:
        durations = [max(1, int(getattr(rt, "duration", 1) or 1)) for rt in rts]
        duration_from_rts = max(durations) if durations else duration
    except Exception:
        duration_from_rts = max(1, int(duration or 1))

    sessions_per_week = int(math.ceil(total_periods_per_week / max(1, duration_from_rts)))
    return room_type, sessions_per_week, duration_from_rts


def _uf_find(uf: dict, x: int) -> int:
    if uf[x] != x:
        uf[x] = _uf_find(uf, uf[x])
    return uf[x]


def _uf_union(uf: dict, a: int, b: int) -> None:
    ra, rb = _uf_find(uf, a), _uf_find(uf, b)
    if ra != rb:
        uf[rb] = ra


def _build_fixed_groups_from_db_groups(
    db: Session,
    user_id: str,
    batch_subjects: dict[int, dict[int, int]],
    subj_to_batches: dict[int, set[int]],
    variant_to_base_subject: dict[int, int],
    variant_room_type: dict[int, str],
) -> dict[int, list[list[int]]]:
    """
    Solver expects fixed_groups[subject_id] = list of batch-id groups that must share
    the same slot for that subject. Start from singletons, merge batches that appear
    together in the same FixedGroup for every subject common to all those batches.
    """
    fixed_groups: dict[int, list[list[int]]] = {
        sid: [[b] for b in sorted(subj_to_batches[sid])]
        for sid in subj_to_batches
    }

    fg_rows = (
        db.query(models.FixedGroup).filter_by(user_id=user_id).all()
    )
    if not fg_rows:
        return fixed_groups

    uf_per_sid: dict[int, dict[int, int]] = {
        sid: {b: b for b in sorted(subj_to_batches[sid])}
        for sid in subj_to_batches
    }

    base_to_variants: dict[int, list[int]] = defaultdict(list)
    for sid, base_sid in variant_to_base_subject.items():
        base_to_variants[base_sid].append(sid)

    for fg in fg_rows:
        g_batches = sorted({fb.batch_id for fb in fg.batches})
        if len(g_batches) < 2:
            continue

        common_variant_subjects = None
        for b in g_batches:
            subs = set(batch_subjects.get(b, {}).keys())
            common_variant_subjects = (
                subs if common_variant_subjects is None else common_variant_subjects & subs
            )
        if not common_variant_subjects:
            continue

        common_base_subjects = {
            variant_to_base_subject[sid]
            for sid in common_variant_subjects
            if sid in variant_to_base_subject
        }

        allowed_room_types = {
            _norm_room_type(rt) for rt in (fg.room_types or [])
        }

        for base_sid in common_base_subjects:
            candidate_variants = base_to_variants.get(base_sid, [])
            for sid in candidate_variants:
                if sid not in uf_per_sid:
                    continue
                if allowed_room_types and _norm_room_type(variant_room_type.get(sid, "")) not in allowed_room_types:
                    continue
                uf = uf_per_sid[sid]
                first = g_batches[0]
                if first not in uf:
                    continue
                for b in g_batches[1:]:
                    if b in uf:
                        _uf_union(uf, first, b)

    merged: dict[int, list[list[int]]] = {}
    for sid, uf in uf_per_sid.items():
        comp: dict[int, list[int]] = defaultdict(list)
        for b in sorted(subj_to_batches[sid]):
            r = _uf_find(uf, b)
            comp[r].append(b)
        merged[sid] = [sorted(v) for v in comp.values()]

    return merged


def fetch_timetable_data(db: Session, user_id: str) -> dict:
    user_departments = {
        d.department_id: d
        for d in db.query(models.Department).filter_by(user_id=user_id).all()
    }

    db_slots = (
        db.query(models.Timeslot).filter_by(user_id=user_id).all()
    )
    ordered_slots = sorted(
        db_slots,
        key=lambda ts: (
            DAY_ORDER.get(ts.day_of_week, 99),
            ts.slot_number,
            ts.timeslot_id,
        ),
    )

    timeslots_meta = []
    for i, ts in enumerate(ordered_slots):
        timeslots_meta.append(
            {
                "index": i,
                "timeslot_id": ts.timeslot_id,
                "day_of_week": ts.day_of_week,
                "slot_number": ts.slot_number,
                "start_time": ts.start_time,
                "end_time": ts.end_time,
                "label": _slot_time_key(ts),
            }
        )

    slots_per_day = max((ts.slot_number for ts in ordered_slots), default=0)
    if slots_per_day <= 0:
        slots_per_day = 1

    num_days = len(ordered_slots) // slots_per_day if ordered_slots else 0
    if ordered_slots and len(ordered_slots) % slots_per_day != 0:
        num_days = (len(ordered_slots) + slots_per_day - 1) // slots_per_day

    timeslots = list(range(len(ordered_slots)))

    # --- Teachers (only if they teach at least one subject in user's departments) ---
    teachers: dict[int, dict] = {}
    for t in db.query(models.Teacher).filter_by(user_id=user_id).all():
        subject_ids = []
        for ts in db.query(models.TeacherSubject).filter_by(teacher_id=t.teacher_id).all():
            subj = db.query(models.Subject).filter_by(subject_id=ts.subject_id).first()
            if subj and subj.department_id in user_departments:
                subject_ids.append(subj.subject_id)
        if not subject_ids:
            continue

        avail = t.availability_time_slots
        if isinstance(avail, str):
            try:
                avail = json.loads(avail)
            except Exception:
                avail = {}
        shifts = teacher_availability_indices(avail, ordered_slots)

        teachers[t.teacher_id] = {
            "teacher_name": t.teacher_name,
            "subjects": subject_ids,
            "available_shifts": shifts,
        }

    # --- Subjects in user's departments ---
    subjects: dict[int, dict] = {}
    base_to_variants: dict[int, list[int]] = defaultdict(list)
    variant_to_base_subject: dict[int, int] = {}
    variant_room_type: dict[int, str] = {}
    next_variant_id = 1_000_000
    subject_rows = (
        db.query(models.Subject)
        .filter(models.Subject.department_id.in_(user_departments.keys()))
        .all()
    )
    for s in subject_rows:
        subj_teachers = [
            ts.teacher_id
            for ts in db.query(models.TeacherSubject)
            .filter_by(subject_id=s.subject_id)
            .all()
            if ts.teacher_id in teachers
        ]
        room_reqs = (
            db.query(models.SubjectRoomType)
            .filter_by(subject_id=s.subject_id)
            .all()
        )
        if not room_reqs:
            room_reqs = [None]

        for rt in room_reqs:
            if rt is not None and int(getattr(rt, "classes_per_week", 0) or 0) <= 0:
                # Ignore zero-demand room-type rows to avoid forcing extra sessions.
                continue
            sid = next_variant_id
            next_variant_id += 1

            room_type = _norm_room_type(getattr(rt, "room_type", "classroom") or "classroom")
            total_periods_per_week = int(getattr(rt, "classes_per_week", 0) or 0)
            if total_periods_per_week <= 0:
                total_periods_per_week = 1
            duration = max(1, int(getattr(rt, "duration", s.duration or 1) or 1))
            # Solver expects starts/sessions per week, not total periods.
            per_week = int(math.ceil(total_periods_per_week / max(1, duration)))
            if per_week <= 0:
                per_week = 1

            room_type_label = room_type.replace("_", " ").title()
            subjects[sid] = {
                "subject_name": f"{s.subject_name} ({room_type_label})",
                "course_code": s.course_code,
                "teachers": subj_teachers,
                "room_type": room_type,
                "per_week": per_week,
                "duration": duration,
            }
            base_to_variants[s.subject_id].append(sid)
            variant_to_base_subject[sid] = s.subject_id
            variant_room_type[sid] = room_type

        if s.subject_id not in base_to_variants:
            # Fallback when all room-type rows are zero/invalid.
            sid = next_variant_id
            next_variant_id += 1
            fallback_room_type, fallback_per_week, fallback_duration = _subject_defaults(db, s.subject_id)
            subjects[sid] = {
                "subject_name": s.subject_name,
                "course_code": s.course_code,
                "teachers": subj_teachers,
                "room_type": _norm_room_type(fallback_room_type),
                "per_week": max(1, int(fallback_per_week or 1)),
                "duration": max(1, int(fallback_duration or 1)),
            }
            base_to_variants[s.subject_id].append(sid)
            variant_to_base_subject[sid] = s.subject_id
            variant_room_type[sid] = _norm_room_type(fallback_room_type)

    # Drop subjects with no assigned teacher (solver cannot place them)
    subjects = {sid: sd for sid, sd in subjects.items() if sd["teachers"]}
    variant_to_base_subject = {
        sid: base_sid for sid, base_sid in variant_to_base_subject.items() if sid in subjects
    }
    base_to_variants = {
        base_sid: [sid for sid in sids if sid in subjects]
        for base_sid, sids in base_to_variants.items()
    }

    # --- Rooms ---
    rooms = {
        r.room_code: _norm_room_type(r.classroom_type)
        for r in db.query(models.Classroom).filter_by(user_id=user_id).all()
    }

    # --- Batches + batch_subjects (only subjects we can teach) ---
    batches: list[int] = []
    batch_subjects: dict[int, dict[int, int]] = {}
    for b in db.query(models.Batch).filter_by(user_id=user_id).all():
        if b.department_id not in user_departments:
            continue
        bmap: dict[int, int] = {}
        for bs in db.query(models.BatchSubject).filter_by(batch_id=b.batch_id).all():
            variant_ids = base_to_variants.get(bs.subject_id, [])
            if not variant_ids:
                continue
            for sid in variant_ids:
                # Keep room-type specific demand from subject_room_types when variants exist.
                cpw = int(subjects[sid]["per_week"])
                if len(variant_ids) == 1 and bs.classes_per_week:
                    cpw = int(bs.classes_per_week)
                bmap[sid] = max(cpw, 1)
        if not bmap:
            continue
        batches.append(b.batch_id)
        batch_subjects[b.batch_id] = bmap

    # Refresh per_week on subjects from max batch demand (solver uses one per_week per subject)
    for sid in subjects:
        max_cpw = max(
            (
                batch_subjects[bid].get(sid, 0)
                for bid in batch_subjects
                if sid in batch_subjects[bid]
            ),
            default=subjects[sid]["per_week"],
        )
        subjects[sid]["per_week"] = max(max_cpw, 1)

    # --- fixed_groups: subject_id -> list of batch groups (solver keys by subject) ---
    subj_to_batches: dict[int, set[int]] = defaultdict(set)
    for bid, smap in batch_subjects.items():
        for sid in smap:
            subj_to_batches[sid].add(bid)

    fixed_groups = _build_fixed_groups_from_db_groups(
        db, user_id, batch_subjects, subj_to_batches, variant_to_base_subject, variant_room_type
    )

    # --- Display lookups for UI ---
    batch_lookup = {}
    for b in db.query(models.Batch).filter_by(user_id=user_id).all():
        batch_lookup[b.batch_id] = b.batch_name

    teacher_lookup = {
        t.teacher_id: t.teacher_name
        for t in db.query(models.Teacher).filter_by(user_id=user_id).all()
    }

    subject_lookup = {sid: sd["subject_name"] for sid, sd in subjects.items()}

    dept_lookup = {
        d.department_id: d.department_name for d in user_departments.values()
    }

    batch_department = {}
    for b in db.query(models.Batch).filter_by(user_id=user_id).all():
        batch_department[b.batch_id] = b.department_id

    display_lookups = {
        "batches": batch_lookup,
        "teachers": teacher_lookup,
        "subjects": subject_lookup,
        "departments": dept_lookup,
        "batch_department": batch_department,
    }

    return {
        "user_id": user_id,
        "batches": batches,
        "timeslots": timeslots,
        "rooms": rooms,
        "teachers": teachers,
        "subjects": subjects,
        "batch_subjects": batch_subjects,
        "fixed_groups": fixed_groups,
        "slots_per_day": slots_per_day,
        "num_days": max(num_days, 1),
        "timeslots_meta": timeslots_meta,
        "display_lookups": display_lookups,
    }
