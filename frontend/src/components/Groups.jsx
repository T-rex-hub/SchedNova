import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "./layout/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  LayoutDashboard,
  Users,
  LogOut,
  User,
  ChevronDown,
  Plus,
  Trash2,
  CheckCircle,
  Building,
  DoorClosed,
  Layers,
  Play,
  Twitter,
  Linkedin,
  Github,
} from "lucide-react";
import { API_BASE } from "../config/api";

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

const colors = ["#FFD166", "#1D9AF0", "#FF6B6B", "#06D6A0", "#6A00F4", "#F79C66"];

// Align IDs across API (number), JSON edge cases (string), and <select> values (string).
const normalizeDeptId = (v) => {
  if (v === undefined || v === null || v === "") return null;
  return String(v);
};

const sameDeptId = (a, b) => {
  const na = normalizeDeptId(a);
  const nb = normalizeDeptId(b);
  return na !== null && nb !== null && na === nb;
};

const deptRowId = (dept) =>
  dept?.department_id ?? dept?.id ?? dept?.departmentId;

const batchDepartmentId = (b) =>
  b?.department_id ??
  b?.departmentId ??
  b?.department?.department_id ??
  b?.department?.id;

// Initial data (empty, will fetch from backend)
const initialData = {
  batches: [],
  groups: [],
};

export default function Groups() {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const hoverEffect = {
    scale: 1.2,
    transition: { type: "spring", stiffness: 400, damping: 10 },
  };

  // App-specific state for groups and managing batch selections
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [groups, setGroups] = useState(initialData.groups);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [batchRows, setBatchRows] = useState([{ batch_id: "" }]);
  const [roomRows, setRoomRows] = useState([{ roomType: "" }]);
  const [groupNameError, setGroupNameError] = useState("");

  // Fetch batches and departments from backend on load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE}/batches/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        console.log("BATCH API DATA:", data);

        // Backend might return either an array or an object { batches: [...] }
        if (Array.isArray(data)) {
          setBatches(data);
        } else if (Array.isArray(data.batches)) {
          setBatches(data.batches);
        } else {
          setBatches([]);
        }

        // Fetch departments
        const deptRes = await fetch(`${API_BASE}/departments/with-subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const deptData = await deptRes.json();
        setDepartments(Array.isArray(deptData) ? deptData : []);

        // Fetch available room types
        const roomRes = await fetch(`${API_BASE}/classrooms/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const roomData = await roomRes.json();

        console.log("ROOM TYPES:", roomData);
        // Handle both array of strings and array of objects
        if (Array.isArray(roomData)) {
          setRoomTypes(roomData);
        } else if (Array.isArray(roomData.classrooms)) {
          setRoomTypes(roomData.classrooms);
        } else {
          setRoomTypes([]);
        }

        setGroups(initialData.groups);
        setIsContentVisible(true);
      } catch (err) {
        console.error("Failed to fetch batches or departments:", err);
      }
    };

    fetchInitialData();
  }, []);

  // Save data to backend with debounce
  const saveData = useCallback(
    debounce(async (dataToSave) => {
      console.log("Simulating API call to save data:", dataToSave);
      console.log("Data saved successfully!");
    }, 1000),
    []
  );

  // Trigger save whenever groups data changes
  useEffect(() => {
    saveData({ groups });
  }, [groups, saveData]);

  // --- Group handling ---
  const handleAddGroup = () => {
    let hasError = false;

    if (!newGroupName.trim()) {
      setGroupNameError("Group name cannot be empty.");
      hasError = true;
    } else {
      const isDuplicate = groups.some(
        (group) =>
          sameDeptId(group.department_id, selectedDepartment) &&
          group.name.trim().toLowerCase() === newGroupName.trim().toLowerCase()
      );
      if (isDuplicate) {
        setGroupNameError("A group with this name already exists.");
        hasError = true;
      } else {
        setGroupNameError("");
      }
    }

    const selectedBatchIds = batchRows
      .map((row) => row.batch_id)
      .filter(Boolean);

    if (selectedBatchIds.length === 0) hasError = true;

    const batchesForDept = selectedBatchIds.every((bid) => {
      const batch = batches.find(
        (b) => String(b.batch_id ?? b.id) === String(bid)
      );
      return (
        batch &&
        sameDeptId(batchDepartmentId(batch), selectedDepartment)
      );
    });
    if (!batchesForDept) hasError = true;

    const selectedRoomTypes = roomRows
      .map((r) => r.roomType)
      .filter(Boolean);
    if (selectedRoomTypes.length === 0) hasError = true;

    if (hasError) return;

    const newGroup = {
      id: Date.now(),
      name: newGroupName.trim(),
      department_id: selectedDepartment,
      batch_ids: selectedBatchIds,
      room_types: selectedRoomTypes,
      isComplete: true,
    };

    setGroups([...groups, newGroup]);
    setNewGroupName("");
    setBatchRows([{ batch_id: "" }]);
    setRoomRows([{ roomType: "" }]);
    setGroupNameError("");
  };

  const handleRemoveGroup = (groupId) => {
    setGroups(groups.filter((g) => g.id !== groupId));
  };
  
  const handleBatchInputChange = (groupId, index, value) => {
      setGroups(prevGroups => prevGroups.map(group => {
          if (group.id === groupId) {
              const newBatchInputs = [...group.batchInputs];
              newBatchInputs[index] = value;
              // Also clear the error for this input when user starts typing
              const newErrors = [...group.batchInputErrors];
              newErrors[index] = "";
              return { ...group, batchInputs: newBatchInputs, batchInputErrors: newErrors };
          }
          return group;
      }));
  };

  const handleCompleteGroup = (groupId) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id !== groupId) return group;

        // --- Validation Logic ---
        const newErrors = Array(group.numberOfBatches).fill("");
        const validatedBatches = [];
        let hasError = false;

        const lowercasedInputs = group.batchInputs.map(b => b.trim().toLowerCase());

        group.batchInputs.forEach((batchInputName, index) => {
            const trimmedName = batchInputName.trim();
            if (!trimmedName) {
                newErrors[index] = "Batch name cannot be empty.";
                hasError = true;
                return;
            }

            // Check for duplicates within the group
            if (lowercasedInputs.indexOf(trimmedName.toLowerCase()) !== lowercasedInputs.lastIndexOf(trimmedName.toLowerCase())) {
                newErrors[index] = "Duplicate batch in this group.";
                hasError = true;
                return;
            }

            // Find the batch in the master list
            const batchExists = batches.find(
                (b) => b.batch_name.toLowerCase() === trimmedName.toLowerCase()
            );

            if (!batchExists) {
                newErrors[index] = "Batch not found.";
                hasError = true;
            } else {
                validatedBatches.push(batchExists);
            }
        });
        // --- End Validation ---

        if (hasError) {
            return { ...group, batchInputErrors: newErrors };
        } else {
            return {
                ...group,
                isComplete: true,
                batches: validatedBatches,
                batchInputErrors: Array(group.numberOfBatches).fill(""),
            };
        }
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

  const getGroupType = (batchesCount) => {
    if (batchesCount === 1) return "Single Batch Group";
    if (batchesCount === 2) return "Two-Batch Group";
    if (batchesCount > 2) return "Multi-Batch Group";
    return "Empty Group";
  };
  
    const isGroupReadyToComplete = (group) => {
        return !group.batchInputs.some(input => input.trim() === '');
    };

  return (
    <AppLayout>
          <main className="flex-1 p-2 sm:p-3 md:p-6 overflow-y-auto">
            <AnimatePresence>
              {isContentVisible && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="max-w-5xl mx-auto space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6 bg-purple-900/50 backdrop-blur-md rounded-xl shadow-lg"
                >
                  <div className="flex justify-between items-center gap-3 mb-4">
                    <h3 className="text-xl font-semibold">Group Management</h3>
                    <motion.button
                      onClick={() => setShowCreateGroup(!showCreateGroup)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-full bg-yellow-400 text-purple-900"
                    >
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                  

                  {/* Department Based Groups */}
                  <div className="space-y-8">
                    {departments.map((dept) => {
                      const deptId = deptRowId(dept);
                      const batchList = Array.isArray(batches)
                        ? batches.filter((b) =>
                            sameDeptId(batchDepartmentId(b), deptId)
                          )
                        : [];

                      const deptGroups = groups.filter((g) =>
                        sameDeptId(g.department_id, deptId)
                      );

                      return (
                        <div
                          key={deptId ?? dept.department_name}
                          className="p-3 sm:p-4 md:p-6 rounded-xl bg-purple-800/70 shadow-lg border border-purple-700"
                        >
                          <div className="flex justify-between items-center gap-2 mb-4">
                            <h4 className="text-2xl font-bold">{dept.department_name}</h4>

                            <motion.button
                              onClick={() => {
                                setSelectedDepartment(deptId);
                                setShowCreateGroup(true);
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-3 rounded-full bg-yellow-400 text-purple-900"
                            >
                              <Plus className="w-5 h-5" />
                            </motion.button>
                          </div>

                          {showCreateGroup &&
                            sameDeptId(selectedDepartment, deptId) && (
                            <div className="space-y-2 bg-purple-900/70 p-4 rounded-lg mb-4">
                                <h4 className="text-base sm:text-lg font-semibold text-center mb-4">Create New Group</h4>

                              <div className="flex flex-col lg:flex-row items-start gap-3 md:gap-4">
                                <div className="w-full">
                                  <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-md bg-purple-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    placeholder="Enter group name..."
                                  />
                                  {groupNameError && <p className="text-red-300 text-xs mt-1">{groupNameError}</p>}
                                </div>

                                <div className="w-full space-y-2">
                                  {batchRows.map((row, index) => (
                                    <div key={index} className="flex gap-2 sm:gap-3 items-center">
                                      <select
                                        value={String(row.batch_id || "")}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setBatchRows(prev => {
                                            const newRows = [...prev];
                                            newRows[index] = {
                                              ...newRows[index],
                                              batch_id: value
                                            };
                                            return newRows;
                                          });
                                        }}
                                        className="flex-1 px-4 py-2 rounded-md bg-purple-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                      >
                                        <option value="">Select Batch</option>
                                        {batchList
                                          .filter(b =>
                                            !batchRows.some((row, i) =>
                                              i !== index &&
                                              String(row.batch_id) === String(b.batch_id ?? b.id)
                                            )
                                          )
                                          .map((b) => (
                                            <option
                                              key={b.batch_id ?? b.id}
                                              value={String(b.batch_id ?? b.id)}
                                            >
                                              {b.batch_name ?? b.name}
                                            </option>
                                          ))}
                                      </select>

                                      <motion.button
                                        onClick={() =>
                                          setBatchRows([...batchRows, { batch_id: "" }])
                                        }
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-2 rounded-lg bg-yellow-400 text-purple-900 shrink-0"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </motion.button>

                                      {batchRows.length > 1 && (
                                        <motion.button
                                          onClick={() =>
                                            setBatchRows(batchRows.filter((_, i) => i !== index))
                                          }
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          className="p-2 rounded-lg bg-red-400 text-white shrink-0"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </motion.button>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                <motion.button
                                  onClick={handleAddGroup}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="w-full lg:w-auto p-3 self-center lg:self-start rounded-lg bg-yellow-400 text-purple-900 font-bold transition-all hover:bg-yellow-500"
                                >
                                  <Plus className="w-5 h-5" />
                                </motion.button>
                              </div>

                              {/* Room type selection for the group (not per batch) */}
                              <div className="flex flex-col gap-2 mt-4">
                                <span className="text-xs text-white/60">Select rooms type for grouping</span>
                                <div className="flex flex-col gap-2">
                                  {(() => {
                                    // get unique room types from backend
                                    const uniqueRoomTypes = [
                                      ...new Set(
                                        roomTypes.map((r) => {
                                          // 🔥 FIX: handle string response from backend
                                          if (typeof r === "string") return r;
                                          return (
                                            r.classroom_type ||
                                            r.room_type ||
                                            r.type ||
                                            r.classroom_type_enum
                                          );
                                        }).filter(Boolean)
                                      ),
                                    ];

                                    return roomRows.map((row, index) => (
                                      <div key={index} className="flex gap-2 items-center">
                                        <select
                                          value={row.roomType || ""}
                                          onChange={(e) => {
                                            const newRows = [...roomRows];
                                            newRows[index].roomType = e.target.value;
                                            setRoomRows(newRows);
                                          }}
                                          className="flex-1 px-4 py-2 rounded-md bg-purple-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                        >
                                          <option value="">Select Room Type</option>
                                          {uniqueRoomTypes.map((type, i) => {
                                            const displayName = type
                                              .replaceAll("_", " ")
                                              .replace(/\b\w/g, (c) => c.toUpperCase());
                                            return (
                                              <option key={i} value={type}>
                                                {displayName}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        {/* ADD BUTTON */}
                                        <button
                                          onClick={() =>
                                            setRoomRows([
                                              ...roomRows,
                                              { roomType: "" },
                                            ])
                                          }
                                          className="p-2 rounded bg-yellow-400 text-purple-900 shrink-0"
                                        >
                                          <Plus size={16} />
                                        </button>
                                        {/* REMOVE BUTTON */}
                                        {roomRows.length > 1 && (
                                          <button
                                            onClick={() =>
                                              setRoomRows(
                                                roomRows.filter((_, i) => i !== index)
                                              )
                                            }
                                            className="p-2 rounded bg-red-400 text-white shrink-0"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        )}
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                          {deptGroups.length === 0 ? (
                            <p className="text-white/50">No groups created for this department.</p>
                          ) : (
                            <div className="space-y-3">
                              {deptGroups.map((group) => (
                                <div
                                  key={group.id}
                                  className="p-4 rounded-lg bg-purple-900/60 border border-purple-700"
                                >
                                  <div className="flex justify-between items-start gap-3">
                                    <div>
                                      <p className="font-semibold break-words">{group.name}</p>
                                      <p className="text-sm text-white/60 break-words">
                                        {group.room_types?.map(rt =>
                                          rt.replaceAll("_", " ").toUpperCase()
                                        ).join(", ")}
                                      </p>
                                    </div>

                                    <motion.button
                                      onClick={() => handleRemoveGroup(group.id)}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="text-red-400"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </motion.button>
                                  </div>

                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {group.batch_ids?.map((id) => {
                                      const batch = batches.find((b) => (b.batch_id ?? b.id) == id);
                                      return (
                                        <span
                                          key={id}
                                          className="px-3 py-1 text-sm rounded-full bg-purple-700/60 border border-purple-600"
                                        >
                                          {batch?.batch_name ?? batch?.name ?? "Batch"}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
          
          {/* Navigation Buttons */}
          <div className="max-w-5xl mx-auto flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-4 mt-6 md:mt-8">
            <motion.a
              href="/batch"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-bold transition-all bg-[#4A0D8D] hover:bg-[#6A00F4]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </motion.a>

            <motion.button
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");

                  const payload = {
                    groups: groups.map((g) => ({
                      group_name: g.name,
                      department_id: g.department_id,
                      room_types: g.room_types,
                      batch_ids: g.batch_ids,
                    })),
                  };

                  await fetch(`${API_BASE}/groups/add`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                  });

                  window.location.href = "/generate-final-timetable";
                } catch (err) {
                  console.error("Failed saving groups", err);
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-bold transition-all bg-[#4A0D8D] hover:bg-[#6A00F4]"
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

