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

// Simulated initial data for batches.
// In a real application, batches would be fetched from the backend.
const initialData = {
  batches: [
    { id: 1, name: "Batch 1" },
    { id: 2, name: "Batch 2" },
    { id: 3, name: "Batch 3" },
    { id: 4, name: "Batch 4" },
    { id: 5, name: "Batch A" },
    { id: 6, name: "Batch B" },
  ],
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
  const [groups, setGroups] = useState(initialData.groups);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupBatchCount, setNewGroupBatchCount] = useState(""); // New state for number of batches
  const [groupNameError, setGroupNameError] = useState("");
  const [batchCountError, setBatchCountError] = useState(""); // New error state

  // Simulated API call to fetch initial data on load
  useEffect(() => {
    setTimeout(() => {
      setBatches(initialData.batches);
      setGroups(initialData.groups);
      setIsContentVisible(true);
    }, 100);
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
        const isDuplicate = groups.some(group => group.name.trim().toLowerCase() === newGroupName.trim().toLowerCase());
        if (isDuplicate) {
          setGroupNameError("A group with this name already exists.");
          hasError = true;
        } else {
            setGroupNameError("");
        }
    }

    if (!newGroupBatchCount || newGroupBatchCount < 1) {
        setBatchCountError("Number of batches must be at least 1.");
        hasError = true;
    } else {
        setBatchCountError("");
    }

    if (hasError) return;

    const newGroup = {
      id: Date.now(),
      name: newGroupName.trim(),
      color: colors[groups.length % colors.length],
      isComplete: false,
      numberOfBatches: parseInt(newGroupBatchCount, 10),
      batchInputs: Array(parseInt(newGroupBatchCount, 10)).fill(""),
      batchInputErrors: Array(parseInt(newGroupBatchCount, 10)).fill(""),
      batches: [], // This will be populated on completion
    };
    setGroups([...groups, newGroup]);
    setNewGroupName("");
    setNewGroupBatchCount(2); // Reset to default
    setGroupNameError("");
    setBatchCountError("");
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
                (b) => b.name.toLowerCase() === trimmedName.toLowerCase()
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
          <main className="flex-1 p-8 overflow-y-auto">
            <AnimatePresence>
              {isContentVisible && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="max-w-4xl mx-auto space-y-8 p-6 bg-purple-900/50 backdrop-blur-md rounded-xl shadow-lg"
                >
                  <h3 className="text-xl font-semibold mb-4 text-center">
                    Group Management
                  </h3>
                  
                  {/* Create Group Section */}
                  <div className="space-y-2 bg-purple-900/70 p-4 rounded-lg">
                     <h4 className="text-lg font-semibold text-center mb-4">Create New Group</h4>
                    <div className="flex flex-col md:flex-row items-start gap-4">
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-full px-4 py-2 rounded-md bg-purple-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          placeholder="Enter group name..."
                        />
                        {groupNameError && <p className="text-red-300 text-xs mt-1">{groupNameError}</p>}
                      </div>
                      <div className="w-full md:w-auto">
                        <input
                           type="number"
                           value={newGroupBatchCount}
                           onChange={(e) => setNewGroupBatchCount(e.target.value)}
                           min="1"
                           className="w-full md:w-40 px-4 py-2 rounded-md bg-purple-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                           placeholder="No. of batches"
                        />
                        {batchCountError && <p className="text-red-300 text-xs mt-1">{batchCountError}</p>}
                      </div>
                      <motion.button
                        onClick={handleAddGroup}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 self-center md:self-start rounded-lg bg-yellow-400 text-purple-900 font-bold transition-all hover:bg-yellow-500"
                      >
                        <Plus className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Created Groups List */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold">Created Groups</h4>
                    {groups.length === 0 ? (
                      <p className="text-center text-white/50">No groups have been created yet.</p>
                    ) : (
                      groups.map((group) => (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                          className="p-6 rounded-xl bg-purple-800/70 shadow-lg border border-purple-700"
                          style={{ borderLeftColor: group.color, borderLeftWidth: "4px" }}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex-1">
                              <h4 className="text-xl font-bold">{group.name}</h4>
                              <span className="text-sm text-white/70">{getGroupType(group.numberOfBatches)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {group.isComplete ? (
                                <span className="text-green-400 flex items-center gap-2">
                                  <CheckCircle className="w-6 h-6" /> Completed
                                </span>
                              ) : (
                                <motion.button
                                  onClick={() => handleCompleteGroup(group.id)}
                                  title={!isGroupReadyToComplete(group) ? "All batch names must be filled to complete." : "Click to validate and complete the group."}
                                  disabled={!isGroupReadyToComplete(group)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className={`px-4 py-2 rounded-lg text-white font-bold transition-all ${
                                    !isGroupReadyToComplete(group)
                                      ? 'bg-gray-500 cursor-not-allowed'
                                      : 'bg-green-500 hover:bg-green-600'
                                  }`}
                                >
                                  Complete
                                </motion.button>
                              )}
                              <motion.button
                                onClick={() => handleRemoveGroup(group.id)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded-full text-red-300 hover:text-red-500"
                              >
                                <Trash2 className="w-5 h-5" />
                              </motion.button>
                            </div>
                          </div>
                          
                          {/* Batch Inputs Section */}
                          {!group.isComplete ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {group.batchInputs.map((input, index) => (
                                    <div key={index}>
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => handleBatchInputChange(group.id, index, e.target.value)}
                                            className="w-full px-4 py-2 rounded-md bg-purple-900/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                            placeholder={`Enter Batch ${index + 1} name...`}
                                        />
                                        {group.batchInputErrors[index] && (
                                            <p className="text-red-300 text-xs mt-1">{group.batchInputErrors[index]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                          ) : (
                             <div className="flex flex-wrap gap-2 mt-2">
                                {group.batches.map((batch) => (
                                  <motion.div
                                    key={batch.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-purple-700/60 border border-purple-600"
                                  >
                                    <span className="text-white">{batch.name}</span>
                                  </motion.div>
                                ))}
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
          
          {/* Navigation Buttons */}
          <div className="max-w-4xl mx-auto flex justify-between mt-8">
            <motion.a
              href="/batch"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold transition-all bg-[#4A0D8D] hover:bg-[#6A00F4]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </motion.a>

            <motion.a
              href="/generate-final-timetable"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold transition-all bg-[#4A0D8D] hover:bg-[#6A00F4]">
              Next
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.a>
          </div>
  </AppLayout>
);
}

