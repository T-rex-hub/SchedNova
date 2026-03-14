import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, LayoutDashboard, Calendar, Users, Settings, LogOut, User, ChevronDown, Building,DoorClosed,Layers, Twitter, Linkedin, Github,Play, Plus, Trash2 } from "lucide-react";
import AppLayout from "./layout/AppLayout";

// Debounce utility function to limit write operations to a backend
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// Data for dropdown options
const roomTypes = ["Classroom", "Lab", "Seminar Hall", "Auditorium", "Library"];
const classTypes = ["Lecture", "Lab", "Tutorial"];
const allDays = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

// Simulated data to mimic fetching from the backend
const initialData = {
  teachers: [],
  periodsCount: 5,
  timeSlots: [
    { from: "09:00", to: "10:00" },
    { from: "10:00", to: "11:00" },
    { from: "11:00", to: "12:00" },
    { from: "12:00", to: "13:00" },
    { from: "14:00", to: "15:00" },
  ],
  departments: [],
};

export default function Teachers() {
  const hoverEffect = {
    scale: 1.2,
    transition: { type: "spring", stiffness: 400, damping: 10 },
  };

  // App-specific state
  const [teachers, setTeachers] = useState(initialData.teachers);
  const [departments, setDepartments] = useState([]);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [periodsCount, setPeriodsCount] = useState(0);
  const [timeSlots, setTimeSlots] = useState([]);
  const [isContentVisible, setIsContentVisible] = useState(false);

 // Simulated API call to fetch initial data on load
 useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("http://127.0.0.1:8000/departments/with-subjects", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const deptData = await res.json();

        setTeachers([]);
        setPeriodsCount(initialData.periodsCount);
        setTimeSlots(initialData.timeSlots);
        setDepartments(deptData);
        setIsContentVisible(true);
      } catch (err) {
        console.error("Failed to fetch departments/subjects", err);
      }
    };

    fetchData();
 }, []);

  // Save data to backend with debounce
  const saveData = useCallback(
    debounce(async (dataToSave) => {
      console.log("Simulating API call to save data:", dataToSave);
      console.log("Data saved successfully!");
    }, 1000),
    []
  );

  // Trigger save whenever relevant data changes
  useEffect(() => {
    saveData({ teachers, departments });
  }, [teachers, departments, saveData]);

  // --- Department and Subject Handling (from previous Configuration.jsx) ---
  const handleAddDepartment = () => {
    if (newDepartmentName.trim()) {
      const newDept = {
        id: Date.now(),
        name: newDepartmentName.trim(),
        subjects: [],
        showSubjectInput: false,
        newSubjectCode: "",
        newSubjectName: "",
      };
      setDepartments([...departments, newDept]);
      setNewDepartmentName("");
    }
  };

  const handleAddSubject = (deptId) => {
    setDepartments(
      departments.map((dept) => {
        if (dept.id === deptId) {
          const newSubject = {
            id: Date.now(),
            code: dept.newSubjectCode.trim(),
            name: dept.newSubjectName.trim(),
            classTypes: [],
            showClassTypeInput: false,
            newClassType: "",
            newRoomType: "",
            newClassesPerWeek: "",
            newHoursPerDay: "",
          };
          if (newSubject.code && newSubject.name) {
            return {
              ...dept,
              subjects: [...dept.subjects, newSubject],
              showSubjectInput: false,
              newSubjectCode: "",
              newSubjectName: "",
            };
          }
        }
        return dept;
      })
    );
  };
  
 // Find a course name from the departments state
 const getCourseName = (courseCode) => {
  if (!departments) return "Course Not Found";
  for (const dept of departments) {
     for (const subj of dept.subjects) {
       if (subj.subject_code.toUpperCase() === courseCode.toUpperCase()) {
         return subj.subject_name;
       }
     }
   }
   return "Course Not Found";
 };

  // Memoize the list of all available courses to prevent re-calculation on every render
  const allCourses = useMemo(() => {
  if (!departments || departments.length === 0) return [];

  return departments.flatMap(dept =>
    (dept.subjects || []).map(subject => ({
      id: subject.subject_id,
      code: subject.subject_code,
      name: subject.subject_name
    }))
  );
}, [departments]);
  // --- End of Department/Subject Handling ---

// Teacher handling
const handleAddTeacher = () => {
  if (!newTeacherName.trim()) return;

  const initialAvailability = {};

  // Pre‑select all periods so yellow dots appear
  allDays.forEach(day => {
    initialAvailability[day] = timeSlots.map(
      slot => `${slot.from}-${slot.to}`
    );
  });

  const newTeacher = {
    id: Date.now(),
    name: newTeacherName.trim(),
    availability: initialAvailability,
    courses: [],
    newCourseCode: "",
    saved: false
  };

  // Only update UI (do NOT save yet)
  setTeachers(prev => [...prev, newTeacher]);
  setNewTeacherName("");
};

  const handleRemoveTeacher = (teacherId) => {
    setTeachers(teachers.filter((t) => t.id !== teacherId));
  };

  // Availability handling
  const handleAvailabilityToggle = (teacherId, day, period) => {
    setTeachers((prevTeachers) =>
      prevTeachers.map((teacher) => {
        if (teacher.id === teacherId) {
          const newAvailability = { ...teacher.availability };
          const periodsForDay = newAvailability[day] || [];
          const periodString = `${timeSlots[period]?.from}-${timeSlots[period]?.to}`;
          if (periodsForDay.includes(periodString)) {
            newAvailability[day] = periodsForDay.filter((p) => p !== periodString);
          } else {
            newAvailability[day] = [...periodsForDay, periodString].sort();
          }
          return { ...teacher, availability: newAvailability };
        }
        return teacher;
      })
    );
  };

  // Course handling
  const handleAddCourse = (teacherId) => {
    setTeachers((prevTeachers) =>
      prevTeachers.map((teacher) => {
        if (teacher.id === teacherId) {
          const courseId = teacher.newCourseCode;
          const course = allCourses.find(c => String(c.id) === String(courseId));

          if (course) {
          const newCourse = { id: course.id, code: course.code, name: course.name };
            return {
              ...teacher,
              courses: [...teacher.courses, newCourse],
              newCourseCode: "",
            };
          }
        }
        return teacher;
      })
    );
  };

  const handleRemoveCourse = (teacherId, courseCode) => {
    setTeachers((prevTeachers) =>
      prevTeachers.map((teacher) => {
        if (teacher.id === teacherId) {
          return {
            ...teacher,
            courses: teacher.courses.filter((c) => c.code !== courseCode),
          };
        }
        return teacher;
      })
    );
  };

  const navItems = [
      { label: "Add Periods", icon: <LayoutDashboard className="w-5 h-5" />, link: "/add-periods" },
      { label: "Rooms", icon: <DoorClosed className="w-5 h-5" />, link: "/rooms" },
      { label: "Departments", icon: <Building className="w-5 h-5" />, link: "/departments" },
      { label: "Teachers", icon: <Users className="w-5 h-5" />, link: "/teacher" },
      { label: "Batches", icon: <Layers className="w-5 h-5" />, link: "/batch" },
      { label: "Groups", icon: <Users className="w-5 h-5" />, link: "/group" },
      { label: "Generate Timetable", icon: <Play className="w-5 h-5" />, link: "/generate-final-timetable" }
    ];

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
          
          {/* Add Teacher Section */}
          <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl bg-purple-800/70">
            <label htmlFor="teacherName" className="text-lg font-medium whitespace-nowrap">Teacher Name:</label>
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
                whileHover={{ scale: 1.05, transition: { duration: 0.5 } }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 rounded-lg bg-yellow-400 text-purple-900 hover:bg-yellow-500 font-semibold transition"
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Teachers List */}
          <div className="space-y-6">
            {teachers.length === 0 ? (
              <p className="text-center text-white/50">No teachers have been added yet.</p>
            ) : (
              teachers.map((teacher) => (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="p-6 rounded-xl bg-purple-800/70 shadow-lg border border-purple-700"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-2xl font-bold">{teacher.name}</h4>
                    <motion.button
                      onClick={() => handleRemoveTeacher(teacher.id)}
                      whileHover={{ scale: 1.1, transition: { duration: 0.5 } }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-full bg-red-400 text-white hover:bg-red-500 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </div>

                  {/* Weekly Availability Calendar */}
                  <div className="space-y-4">
                    <h5 className="font-semibold text-white/70">Weekly Availability:</h5>
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr>
                            <th className="p-2 text-left">Period</th>
                            {allDays.map(day => (
                              <th key={day} className="p-2 text-center">{day}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: periodsCount }).map((_, periodIndex) => (
                            <tr key={periodIndex}>
                              <td className="p-2 text-left font-medium text-white">
                                {timeSlots[periodIndex]?.from} - {timeSlots[periodIndex]?.to}
                              </td>
                              {allDays.map(day => (
                                <td key={day} className="p-2 text-center">
                                  <motion.button
                                    onClick={() => handleAvailabilityToggle(teacher.id, day, periodIndex)}
                                    whileHover={{ scale: 1.1, transition: { duration: 0.5 } }}
                                    whileTap={{ scale: 0.9 }}
                                    className={`w-8 h-8 rounded-full transition-colors ${
                                      teacher.availability[day]?.includes(`${timeSlots[periodIndex]?.from}-${timeSlots[periodIndex]?.to}`)
                                        ? "bg-yellow-400"
                                        : "bg-purple-900/50 hover:bg-purple-900/70"
                                    }`}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Course Assignments */}
                  <div className="mt-6 space-y-4">
                    <h5 className="font-semibold text-white/70">Courses Assigned:</h5>
                    <div className="flex flex-col md:flex-row gap-2">
                      {/* MODIFICATION: Replaced input with a select dropdown */}
                      <select
                        value={teacher.newCourseCode}
                        onChange={(e) =>
                          setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, newCourseCode: e.target.value } : t))
                        }
                        className="flex-1 px-4 py-2 rounded-md bg-purple-900/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                          <option value="">Select a Course to Add</option>
                          {allCourses.map(course => (
                            <option key={course.id} value={course.id}>
                              {course.code} - {course.name}
                            </option>
                          ))}
                      </select>
                      <motion.button
                        onClick={() => handleAddCourse(teacher.id)}
                        disabled={!teacher.newCourseCode}
                        whileHover={{ scale: 1.05, transition: { duration: 0.5 } }}
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
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex justify-between items-center p-3 rounded-md bg-purple-700/60"
                          >
                            <p className="text-white">
                              <strong>{course.code}</strong> - {course.name}
                            </p>
                            <motion.button
                              onClick={() => handleRemoveCourse(teacher.id, course.code)}
                              whileHover={{ scale: 1.1, transition: { duration: 0.5 } }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1 rounded-full text-red-300 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-center text-white/50">No courses assigned.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </main>
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 p-8">
            <motion.a 
              href="/departments" 
              whileHover={{ scale: 1.05, transition: { duration: 0.5 } }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold transition-all bg-[#4A0D8D] hover:bg-[#6A00F4]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg> Previous
            </motion.a>
            <motion.button
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");

                  for (const teacher of teachers) {
                    await fetch("http://127.0.0.1:8000/teachers/add", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        teacher_name: teacher.name,
                        availability_time_slots: teacher.availability,
                        subjects: teacher.courses.map(c => c.id)
                      })
                    });
                  }

                  window.location.href = "/batch";

                } catch (err) {
                  console.error("Failed to save teachers:", err);
                }
              }}
              whileHover={{ scale: 1.05, transition: { duration: 0.5 } }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold transition-all bg-[#4A0D8D] hover:bg-[#6A00F4]"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>
  </AppLayout>
  );
}