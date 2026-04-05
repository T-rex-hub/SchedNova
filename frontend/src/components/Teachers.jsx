import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import AppLayout from "./layout/AppLayout";

const API_BASE = "http://127.0.0.1:8000";

const DAY_ORDER = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

/** Match backend db_utils._norm_time_part */
function normTimePart(t) {
  if (t == null || t === "") return "";
  const s = String(t).trim();
  const colon = s.indexOf(":");
  if (colon < 0) return s;
  const h = parseInt(s.slice(0, colon), 10);
  const m = parseInt(s.slice(colon + 1, colon + 3) || "0", 10);
  if (Number.isNaN(h)) return s;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Stored in teacher.availability[day]; must match DB row matching in db_utils */
function slotAvailabilityToken(startTime, endTime) {
  return `${normTimePart(startTime)}-${normTimePart(endTime)}`;
}

/**
 * From GET /timeslots/list rows: build ordered days, period rows, and cell lookup.
 */
function buildPeriodGrid(rawSlots) {
  if (!rawSlots?.length) {
    return {
      days: [],
      rows: [],
      getToken: () => null,
      getDisplayLabel: () => "",
    };
  }

  const days = [...new Set(rawSlots.map((s) => s.day_of_week))].sort(
    (a, b) => (DAY_ORDER[a] ?? 99) - (DAY_ORDER[b] ?? 99)
  );

  const slotNumbers = [...new Set(rawSlots.map((s) => s.slot_number))].sort(
    (a, b) => a - b
  );

  const rows = slotNumbers.map((slotNumber) => {
    const sample =
      rawSlots.find((s) => s.slot_number === slotNumber) || rawSlots[0];
    const display = `${normTimePart(sample.start_time)} - ${normTimePart(sample.end_time)}`;
    return { slotNumber, display };
  });

  const getToken = (day, slotNumber) => {
    const row = rawSlots.find(
      (s) => s.day_of_week === day && s.slot_number === slotNumber
    );
    if (!row) return null;
    return slotAvailabilityToken(row.start_time, row.end_time);
  };

  return { days, rows, getToken, rawSlots };
}

function initialAvailabilityForGrid(grid) {
  const initial = {};
  for (const day of grid.days) {
    const tokens = grid.rows
      .map((r) => grid.getToken(day, r.slotNumber))
      .filter(Boolean);
    initial[day] = tokens;
  }
  return initial;
}

const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [dbSlots, setDbSlots] = useState([]);
  const [slotsLoadError, setSlotsLoadError] = useState(null);

  const periodGrid = useMemo(() => buildPeriodGrid(dbSlots), [dbSlots]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const [deptRes, slotRes] = await Promise.all([
          fetch(`${API_BASE}/departments/with-subjects`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/timeslots/list`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const deptData = await deptRes.json();
        setDepartments(Array.isArray(deptData) ? deptData : []);

        if (!slotRes.ok) {
          setSlotsLoadError("Could not load periods. Save periods on Add Periods first.");
          setDbSlots([]);
        } else {
          const slotData = await slotRes.json();
          setDbSlots(Array.isArray(slotData) ? slotData : []);
          setSlotsLoadError(
            Array.isArray(slotData) && slotData.length === 0
              ? "No periods in the database. Go to Add Periods and save your timetable grid first."
              : null
          );
        }

        setTeachers([]);
      } catch (err) {
        console.error("Failed to fetch data", err);
        setSlotsLoadError("Network error loading periods.");
      }
    };

    fetchData();
  }, []);

  const saveData = useCallback(
    debounce(async (dataToSave) => {
      console.log("Simulating API call to save data:", dataToSave);
    }, 1000),
    []
  );

  useEffect(() => {
    saveData({ teachers, departments });
  }, [teachers, departments, saveData]);

  const allCourses = useMemo(() => {
    if (!departments || departments.length === 0) return [];
    return departments.flatMap((dept) =>
      (dept.subjects || []).map((subject) => ({
        id: subject.subject_id,
        code: subject.subject_code,
        name: subject.subject_name,
      }))
    );
  }, [departments]);

  const handleAddTeacher = () => {
    if (!newTeacherName.trim()) return;
    if (periodGrid.days.length === 0 || periodGrid.rows.length === 0) {
      alert("Add and save periods first (Add Periods page), then return here.");
      return;
    }

    const newTeacher = {
      id: Date.now(),
      name: newTeacherName.trim(),
      availability: initialAvailabilityForGrid(periodGrid),
      courses: [],
      newCourseCode: "",
      saved: false,
    };

    setTeachers((prev) => [...prev, newTeacher]);
    setNewTeacherName("");
  };

  const handleRemoveTeacher = (teacherId) => {
    setTeachers(teachers.filter((t) => t.id !== teacherId));
  };

  const handleAvailabilityToggle = (teacherId, day, slotNumber) => {
    const token = periodGrid.getToken(day, slotNumber);
    if (!token) return;

    setTeachers((prevTeachers) =>
      prevTeachers.map((teacher) => {
        if (teacher.id !== teacherId) return teacher;
        const newAvailability = { ...teacher.availability };
        const periodsForDay = newAvailability[day] || [];
        if (periodsForDay.includes(token)) {
          newAvailability[day] = periodsForDay.filter((p) => p !== token);
        } else {
          newAvailability[day] = [...periodsForDay, token].sort();
        }
        return { ...teacher, availability: newAvailability };
      })
    );
  };

  const handleAddCourse = (teacherId) => {
    setTeachers((prevTeachers) =>
      prevTeachers.map((teacher) => {
        if (teacher.id !== teacherId) return teacher;
        const courseId = teacher.newCourseCode;
        const course = allCourses.find((c) => String(c.id) === String(courseId));
        if (course) {
          const newCourse = { id: course.id, code: course.code, name: course.name };
          return {
            ...teacher,
            courses: [...teacher.courses, newCourse],
            newCourseCode: "",
          };
        }
        return teacher;
      })
    );
  };

  const handleRemoveCourse = (teacherId, courseCode) => {
    setTeachers((prevTeachers) =>
      prevTeachers.map((teacher) => {
        if (teacher.id !== teacherId) return teacher;
        return {
          ...teacher,
          courses: teacher.courses.filter((c) => c.code !== courseCode),
        };
      })
    );
  };

  return (
    <AppLayout>
      <main className="flex-1 p-8 overflow-y-auto">
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto space-y-8 p-6 bg-purple-900/50 backdrop-blur-md rounded-xl shadow-lg"
        >
          <h3 className="text-xl font-semibold mb-4 text-center">
            Teacher & Department Management
          </h3>

          {slotsLoadError && (
            <div className="p-4 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-100 text-sm">
              {slotsLoadError}{" "}
              <a
                href="/add-periods"
                className="underline font-semibold text-yellow-300"
              >
                Open Add Periods
              </a>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl bg-purple-800/70">
            <label
              htmlFor="teacherName"
              className="text-lg font-medium whitespace-nowrap"
            >
              Teacher Name:
            </label>
            <div className="flex flex-1 gap-2">
              <input
                type="text"
                id="teacherName"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTeacher()}
                className="flex-1 px-4 py-2 rounded-md bg-purple-900/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter teacher's name..."
              />
              <motion.button
                onClick={handleAddTeacher}
                disabled={periodGrid.rows.length === 0}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 rounded-lg bg-yellow-400 text-purple-900 hover:bg-yellow-500 font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          <div className="space-y-6">
            {teachers.length === 0 ? (
              <p className="text-center text-white/50">
                No teachers have been added yet.
              </p>
            ) : (
              teachers.map((teacher) => (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-xl bg-purple-800/70 shadow-lg border border-purple-700"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-2xl font-bold">{teacher.name}</h4>
                    <motion.button
                      onClick={() => handleRemoveTeacher(teacher.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-full bg-red-400 text-white hover:bg-red-500 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-semibold text-white/70">
                      Weekly availability (from your saved periods)
                    </h5>
                    <p className="text-xs text-white/50">
                      Yellow = free to teach. Click to toggle. Times match what you
                      set on Add Periods.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr>
                            <th className="p-2 text-left">Period</th>
                            {periodGrid.days.map((day) => (
                              <th key={day} className="p-2 text-center">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {periodGrid.rows.map(({ slotNumber, display }) => (
                            <tr key={slotNumber}>
                              <td className="p-2 text-left font-medium text-white whitespace-nowrap">
                                {display}
                              </td>
                              {periodGrid.days.map((day) => {
                                const token = periodGrid.getToken(day, slotNumber);
                                const free =
                                  token &&
                                  teacher.availability[day]?.includes(token);
                                return (
                                  <td key={`${day}-${slotNumber}`} className="p-2 text-center">
                                    {token ? (
                                      <motion.button
                                        type="button"
                                        onClick={() =>
                                          handleAvailabilityToggle(
                                            teacher.id,
                                            day,
                                            slotNumber
                                          )
                                        }
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className={`w-8 h-8 rounded-full transition-colors ${
                                          free
                                            ? "bg-yellow-400"
                                            : "bg-purple-900/50 hover:bg-purple-900/70"
                                        }`}
                                      />
                                    ) : (
                                      <span className="text-white/20 text-xs">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <h5 className="font-semibold text-white/70">Courses Assigned:</h5>
                    <div className="flex flex-col md:flex-row gap-2">
                      <select
                        value={teacher.newCourseCode}
                        onChange={(e) =>
                          setTeachers(
                            teachers.map((t) =>
                              t.id === teacher.id
                                ? { ...t, newCourseCode: e.target.value }
                                : t
                            )
                          )
                        }
                        className="flex-1 px-4 py-2 rounded-md bg-purple-900/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="">Select a Course to Add</option>
                        {allCourses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </select>
                      <motion.button
                        onClick={() => handleAddCourse(teacher.id)}
                        disabled={!teacher.newCourseCode}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-lg bg-yellow-400 text-purple-900 hover:bg-yellow-500 font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Add
                      </motion.button>
                    </div>
                    <div className="space-y-2">
                      {teacher.courses.length > 0 ? (
                        teacher.courses.map((course) => (
                          <motion.div
                            key={course.code}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-between items-center p-3 rounded-md bg-purple-700/60"
                          >
                            <p className="text-white">
                              <strong>{course.code}</strong> - {course.name}
                            </p>
                            <motion.button
                              onClick={() =>
                                handleRemoveCourse(teacher.id, course.code)
                              }
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1 rounded-full text-red-300 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-center text-white/50">
                          No courses assigned.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </main>

      <div className="flex justify-between mt-8 p-8">
        <motion.a
          href="/departments"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold transition-all bg-[#4A0D8D] hover:bg-[#6A00F4]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Previous
        </motion.a>
        <motion.button
          onClick={async () => {
            try {
              const token = localStorage.getItem("token");
              for (const teacher of teachers) {
                await fetch(`${API_BASE}/teachers/add`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    teacher_name: teacher.name,
                    availability_time_slots: teacher.availability,
                    subjects: teacher.courses.map((c) => c.id),
                  }),
                });
              }
              window.location.href = "/batch";
            } catch (err) {
              console.error("Failed to save teachers:", err);
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold transition-all bg-[#4A0D8D] hover:bg-[#6A00F4]"
        >
          Next
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </motion.button>
      </div>
    </AppLayout>
  );
}
