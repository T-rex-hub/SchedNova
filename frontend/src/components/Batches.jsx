import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import AppLayout from "./layout/AppLayout";

// Debounce utility
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
};

export default function BatchAdd() {

  const [departments, setDepartments] = useState([]);
  const [isContentVisible, setIsContentVisible] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("http://127.0.0.1:8000/departments/with-subjects", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        console.log("Departments API response:", data);

        const formatted = data.map((dept) => ({
          id: dept.department_id,
          name: dept.department_name,
          subjects:
            Array.isArray(dept.subjects)
              ? dept.subjects
              : Array.isArray(dept.subject_list)
              ? dept.subject_list
              : Array.isArray(dept.subject)
              ? dept.subject
              : [],
          selectedSubjects: [],
          batches: [],
          newBatchName: "",
          showBatchInput: false,
        }));

        setDepartments(formatted);
        setIsContentVisible(true);
      } catch (err) {
        console.error("Failed to load departments", err);
      }
    };

    fetchDepartments();
  }, []);

  const saveData = useCallback(
    debounce(async (data) => {
      console.log("Saving batches:", data);
    }, 1000),
    []
  );

  useEffect(() => {
    if (isContentVisible) {
      saveData({ departments });
    }
  }, [departments, saveData, isContentVisible]);

  // Add batch (supports comma separated batch names)
  const handleAddBatch = (deptId) => {
    setDepartments(
      departments.map((dept) => {
        if (dept.id !== deptId || !dept.newBatchName.trim()) return dept;

        const batchNames = dept.newBatchName
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name.length > 0);

        const newBatches = batchNames.map((name) => ({
          id: Date.now() + Math.random(),
          name: name,
        }));

        return {
          ...dept,
          batches: [...dept.batches, ...newBatches],
          newBatchName: "",
          showBatchInput: false,
        };
      })
    );
  };

  // Remove batch
  const handleRemoveBatch = (deptId, batchId) => {
    setDepartments(
      departments.map((dept) =>
        dept.id === deptId
          ? {
              ...dept,
              batches: dept.batches.filter((b) => b.id !== batchId),
            }
          : dept
      )
    );
  };

  // Assign selected subjects to all batches in department
  const assignSubjectsToBatches = (deptId) => {
    setDepartments(
      departments.map((dept) => {
        if (dept.id !== deptId) return dept;

        const updatedBatches = dept.batches.map((batch) => ({
          ...batch,
          subjects: dept.selectedSubjects,
        }));

        return {
          ...dept,
          batches: updatedBatches,
        };
      })
    );
  };

  const handleNext = async () => {
    try {
      const token = localStorage.getItem("token");

      const payload = {
        batches: departments.flatMap((dept) =>
          dept.batches.map((batch) => ({
            batch_name: batch.name,
            department_id: dept.id,
            subjects: batch.subjects || []
          }))
        ),
      };

      await fetch("http://127.0.0.1:8000/batches/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      window.location.href = "/group";
    } catch (err) {
      console.error("Failed to save batches", err);
    }
  };

  return (
    <AppLayout>

      <div className="max-w-4xl mx-auto space-y-8 p-6 bg-purple-900/50 backdrop-blur-md rounded-xl shadow-lg">

        <h3 className="text-xl font-semibold text-center">
          Batch Management
        </h3>

        {departments.map((dept) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 rounded-xl bg-purple-800/70 shadow-lg border border-purple-700"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-2xl font-bold">{dept.name}</h4>

              <motion.button
                onClick={() =>
                  setDepartments(
                    departments.map((d) =>
                      d.id === dept.id
                        ? { ...d, showBatchInput: !d.showBatchInput }
                        : d
                    )
                  )
                }
                whileHover={{ scale: 1.05 }}
                className="p-2 rounded-full bg-yellow-400 text-purple-900"
              >
                <Plus size={18} />
              </motion.button>
            </div>

            {/* Subject selector for all batches */}
            <div className="flex gap-3 mb-4">
              <select
                className="flex-1 px-3 py-2 rounded bg-purple-900 text-white"
                value={dept.selectedSubjects[0] || ""}
                onChange={(e) => {
                  const value = e.target.value;

                  setDepartments(
                    departments.map((d) =>
                      d.id === dept.id ? { ...d, selectedSubjects: [value] } : d
                    )
                  );
                }}
              >
                <option value="">Select Subject</option>
                {(dept.subjects || []).map((subj) => (
                  <option key={subj.subject_id} value={subj.subject_id}>
                    {subj.subject_code} - {subj.subject_name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => assignSubjectsToBatches(dept.id)}
                className="bg-yellow-400 px-4 rounded text-black"
              >
                Assign to All Batches
              </button>
            </div>

            {/* Add Batch Input */}
            <AnimatePresence>
              {dept.showBatchInput && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 mb-4"
                >
                  <input
                    value={dept.newBatchName}
                    onChange={(e) =>
                      setDepartments(
                        departments.map((d) =>
                          d.id === dept.id
                            ? { ...d, newBatchName: e.target.value }
                            : d
                        )
                      )
                    }
                    placeholder="Batch name (comma separated e.g. CSE-A, CSE-B, CSE-C)"
                    className="flex-1 px-4 py-2 rounded bg-purple-900 text-white"
                  />

                  <button
                    onClick={() => handleAddBatch(dept.id)}
                    className="bg-yellow-400 px-4 rounded text-black"
                  >
                    Add
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Batch List */}
            <div className="space-y-3">
              {dept.batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex justify-between items-center p-3 rounded bg-purple-700/60"
                >
                  <div>
                    <div>{batch.name}</div>
                    {batch.subjects && batch.subjects.length > 0 && (
                      <div className="text-xs text-gray-300">
                        Subjects: {batch.subjects
                          .map((id) => {
                            const subj = dept.subjects.find((s) => String(s.subject_id) === String(id));
                            return subj ? subj.subject_code : id;
                          })
                          .join(", ")}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      handleRemoveBatch(dept.id, batch.id)
                    }
                  >
                    <Trash2 className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-10 w-full px-12">
        <a
          href="/teacher"
          className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[#4A0D8D] text-white font-bold hover:bg-[#6A00F4] transition-all"
        >
          ← Previous
        </a>

        <motion.button
          onClick={handleNext}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[#4A0D8D] text-white font-bold hover:bg-[#6A00F4] transition-all"
        >
          Next →
        </motion.button>
      </div>

    </AppLayout>
  );
}
