import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Settings,
  Save,
  Loader2,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers,
  Minus
} from "lucide-react";
import AppLayout from "./layout/AppLayout";

// --- Constants ---
const COLORS = ["#FFD166", "#1D9AF0", "#FF6B6B", "#06D6A0", "#6A00F4", "#F79C66", "#9D4EDD", "#EF476F"];


export default function App() {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptsForAdding, setSelectedDeptsForAdding] = useState([]);
  const [rooms, setRooms] = useState([]);
useEffect(() => {
  const fetchRooms = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://127.0.0.1:8000/classrooms/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
  console.error("Failed to fetch classrooms", res.status);
  setRooms([]);
  return;
}

const data = await res.json();

if (Array.isArray(data)) {
  setRooms(data);
} else {
  console.warn("Unexpected classroom response:", data);
  setRooms([]);
}
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    }
  };

  fetchRooms();
}, []);
  // Updated state structure: { "Dept Name": [ { subject_name, course_code, classes_per_week, room_type } ] }
  const [deptSubjects, setDeptSubjects] = useState({});
  const [showAddSection, setShowAddSection] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Navigation Logic
  let navigate;
  try { navigate = useNavigate(); } catch (e) { navigate = (path) => console.log("Navigate to:", path); }

  const handlePrevious = () => navigate("/rooms");
  const handleNext = () => navigate("/teacher");

  // --- Subject Logic Handlers ---
  
  const addSubjectField = (deptName) => {
    setDeptSubjects(prev => ({
      ...prev,
      [deptName]: [
        ...(prev[deptName] || []),
        { subject_name: "", course_code: "", classes_per_week: "", room_type:"" }
      ]
    }));
  };

  const removeSubjectField = (deptName, index) => {
    setDeptSubjects(prev => ({
      ...prev,
      [deptName]: prev[deptName].filter((_, i) => i !== index)
    }));
  };

  const updateSubjectField = (deptName, index, field, value) => {
    setDeptSubjects(prev => {
      const updatedList = [...(prev[deptName] || [])];
      updatedList[index] = { ...updatedList[index], [field]: value };
      return { ...prev, [deptName]: updatedList };
    });
  };

  const handleToggleDeptSelection = (name) => {
    setSelectedDeptsForAdding((prev) => {
      const isRemoving = prev.includes(name);
      if (isRemoving) {
        return prev.filter((n) => n !== name);
      } else {
        // Initialize with one empty subject field when selected
        setDeptSubjects(s => ({
          ...s,
          [name]: [{ subject_name: "", course_code: "", classes_per_week: "", room_type: "" }]
        }));
        return [...prev, name];
      }
    });
  };

  const handleAddDepartments = async () => {
    if (selectedDeptsForAdding.length === 0) return;

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Not authenticated");
      return;
    }

    // Payload structure as requested
    const payload = {
      departments: selectedDeptsForAdding.map((name) => ({
        department_name: name,
        subjects: (deptSubjects[name] || [])
          .filter(s => s.subject_name.trim() !== "")
          .map(s => ({
            subject_name: s.subject_name,
            course_code: s.course_code,
            classes_per_week: parseInt(s.classes_per_week) || 0,
            room_type: s.room_type
          }))
      }))
    };

    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/departments/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Department save failed");
        return;
      }

      // UI update for inventory
      const generatedDepts = selectedDeptsForAdding.map((name) => {
        const subjects = (deptSubjects[name] || [])
          .filter(s => s.subject_name.trim() !== "")
          .map((s) => ({
            id: `${Date.now()}-${Math.random()}`,
            name: s.subject_name,
          }));

        return {
          id: `${Date.now()}-${Math.random()}`,
          name,
          subjects,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
      });

      setDepartments((prev) => [...prev, ...generatedDepts]);
      setSelectedDeptsForAdding([]);
      setDeptSubjects({});
      setShowAddSection(false);
    } catch (e) {
      console.error("Department API error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const removeDepartment = (id) => {
    setDepartments(departments.filter(d => d.id !== id));
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
        
        {/* Main Content Area */}
        <div className="space-y-8 p-8 bg-purple-900/40 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10">
          
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white">Departments & Subjects</h3>
              <p className="text-purple-300 text-sm opacity-80">Define academic structure and courses</p>
            </div>
            <button
              onClick={() => setShowAddSection(!showAddSection)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg ${
                showAddSection ? "bg-red-500/90 hover:bg-red-500 text-white" : "bg-yellow-400 hover:bg-yellow-300 text-purple-900"
              }`}
            >
              {showAddSection ? <X size={20} /> : <Plus size={20} />}
              {showAddSection ? "Cancel" : "Add Dept"}
            </button>
          </div>

          <AnimatePresence>
            {showAddSection && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-purple-800/30 border border-purple-400/20 rounded-2xl overflow-hidden shadow-inner"
              >
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    
                    {/* Step 1: Manage Departments */}
                    <div className="space-y-5">
                      <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                        <Settings size={14} strokeWidth={3} /> Step 1: Manage Departments
                      </h4>
                      <div className="flex gap-2">
                        <input
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newDeptName.trim()) {
                              handleToggleDeptSelection(newDeptName.trim());
                              setNewDeptName("");
                            }
                          }}
                          placeholder="e.g. Computer Science"
                          className="flex-1 px-4 py-3 rounded-xl bg-purple-950/80 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:ring-2 ring-yellow-400/50"
                        />
                        <button 
                          onClick={() => {
                            if(newDeptName.trim()) {
                              handleToggleDeptSelection(newDeptName.trim());
                              setNewDeptName("");
                            }
                          }} 
                          className="bg-yellow-400 text-purple-900 p-3 rounded-xl hover:bg-yellow-300 transition-colors"
                        >
                          <Plus size={22} strokeWidth={3} />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2.5">
                        {selectedDeptsForAdding.map((name) => (
                          <div key={name} className="group relative">
                            <button
                              onClick={() => handleToggleDeptSelection(name)}
                              className="flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-bold text-sm bg-yellow-400 border-yellow-400 text-purple-900"
                            >
                              <Check size={16} strokeWidth={3} />
                              {name}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Define Subjects (Structured Inputs) */}
                    <div className="space-y-5">
                      <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen size={14} strokeWidth={3} /> Step 2: Define Subjects
                      </h4>
                      {selectedDeptsForAdding.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-purple-700 rounded-xl opacity-40">
                          <p className="text-sm text-white">Select departments to start naming subjects</p>
                        </div>
                      ) : (
                        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {selectedDeptsForAdding.map((deptName) => (
                            <div key={deptName} className="space-y-3 p-4 bg-purple-950/40 rounded-xl border border-purple-700/50">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-yellow-400 uppercase px-1">{deptName} Subjects</label>
                                <button 
                                  onClick={() => addSubjectField(deptName)}
                                  className="text-[10px] bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded-md font-bold transition-colors flex items-center gap-1"
                                >
                                  <Plus size={12} /> Add Row
                                </button>
                              </div>

                              <div className="space-y-4">
                                {deptSubjects[deptName]?.map((subj, sIdx) => (
                                  <div key={sIdx} className="space-y-2 pb-3 border-b border-purple-800/50 last:border-0">
                                    <div className="grid grid-cols-12 gap-2">
                                      <div className="col-span-8">
                                        <input
                                          placeholder="Subject Name"
                                          value={subj.subject_name}
                                          onChange={(e) => updateSubjectField(deptName, sIdx, "subject_name", e.target.value)}
                                          className="w-full text-xs px-3 py-2 rounded-lg bg-purple-950/80 border border-purple-700 text-white placeholder-purple-500 focus:outline-none focus:ring-1 ring-yellow-400/50"
                                        />
                                      </div>
                                      <div className="col-span-3">
                                        <input
                                          placeholder="Code"
                                          value={subj.course_code}
                                          onChange={(e) => updateSubjectField(deptName, sIdx, "course_code", e.target.value)}
                                          className="w-full text-xs px-3 py-2 rounded-lg bg-purple-950/80 border border-purple-700 text-white placeholder-purple-500 focus:outline-none focus:ring-1 ring-yellow-400/50"
                                        />
                                      </div>
                                      <div className="col-span-1 flex justify-end">
                                        <button 
                                          onClick={() => removeSubjectField(deptName, sIdx)}
                                          disabled={deptSubjects[deptName].length <= 1}
                                          className="p-1 text-purple-400 hover:text-red-400 transition-colors disabled:opacity-0"
                                        >
                                          <Minus size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        placeholder="Classes/Week"
                                       value={subj.classes_per_week}
                                       onChange={(e) => updateSubjectField(deptName, sIdx, "classes_per_week", e.target.value)}
                                       className="w-full text-xs px-3 py-2 rounded-lg bg-purple-950/80 border border-purple-700 text-white placeholder-purple-500 focus:outline-none focus:ring-1 ring-yellow-400/50"
                                      />
                                      <select
                                        value={subj.room_type}
                                        onChange={(e) => updateSubjectField(deptName, sIdx, "room_type", e.target.value)}
                                        className="w-full text-xs px-3 py-2 rounded-lg bg-purple-950/80 border border-purple-700 text-white focus:outline-none focus:ring-1 ring-yellow-400/50"
                                      >
                                        <option value="" className="bg-purple-950">Select Room Type</option>
                                        {Array.isArray(rooms) && rooms.map(type => (
                                          <option
                                            key={type}
                                            value={type}
                                            className="bg-purple-950"
                                          >
                                            {type}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Changes Part */}
                  {selectedDeptsForAdding.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={handleAddDepartments}
                      disabled={isLoading}
                      className="w-full bg-yellow-400 text-purple-900 py-4 rounded-xl font-black text-lg hover:bg-yellow-300 transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/20 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} strokeWidth={2.5} />}
                      Save Changes to Inventory
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search and Inventory */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-purple-700"></div>
              <h4 className="text-xl font-bold whitespace-nowrap flex items-center gap-3 text-white">
                Inventory <span className="text-xs py-1 px-2.5 bg-white/10 rounded-lg text-yellow-400">{departments.length}</span>
              </h4>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-purple-700"></div>
            </div>

            {departments.length === 0 ? (
              <div className="text-center py-16 px-6 border-2 border-dashed border-purple-800 rounded-3xl opacity-60">
                <Layers size={48} className="mx-auto mb-4 text-purple-400 opacity-20" />
                <p className="text-purple-300 italic">No departments defined yet.</p>
                <p className="text-[10px] text-purple-400 mt-2 uppercase font-bold tracking-widest">Add departments to see them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {departments.map((dept) => (
                    <motion.div
                      key={dept.id}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="group flex flex-col bg-purple-900/60 p-5 rounded-2xl border-l-4 shadow-lg hover:shadow-purple-950/50 transition-all border border-white/5"
                      style={{ borderLeftColor: dept.color }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-0.5">
                          <p className="font-black text-white text-lg leading-tight">{String(dept.name)}</p>
                          <p className="text-[10px] font-black text-purple-400 uppercase tracking-tighter opacity-80">
                            {dept.subjects?.length || 0} Subjects
                          </p>
                        </div>
                        <button 
                          onClick={() => removeDepartment(dept.id)} 
                          className="p-2 text-purple-400 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {dept.subjects?.slice(0, 4).map((s, idx) => (
                          <span key={idx} className="text-[9px] px-2 py-0.5 bg-white/5 rounded-md text-purple-200">
                            {s.name}
                          </span>
                        ))}
                        {dept.subjects?.length > 4 && (
                          <span className="text-[9px] px-2 py-0.5 text-purple-400 font-bold">+{dept.subjects.length - 4} more</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4">
          <button
            type="button"
            onClick={handlePrevious}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-purple-800/80 hover:bg-purple-700 text-white font-black transition-all shadow-xl border border-white/5 active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={3} />
            PREVIOUS
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-purple-800/80 hover:bg-purple-700 text-white font-black transition-all shadow-xl border border-white/5 active:scale-95"
          >
            NEXT
            <ArrowRight size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </AppLayout>
  );
}