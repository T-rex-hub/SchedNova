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

// Initial data
const initialData = {
  departments: [
    {
      id: 1,
      name: "Computer Science & Engineering",
      batches: [
        { id: 101, name: "CSE Batch 2022-26" },
        { id: 102, name: "CSE Batch 2023-27" },
      ],
      newBatchName: "",
      showBatchInput: false,
    },
  ],
};

export default function BatchAdd() {

  const [departments, setDepartments] = useState([]);
  const [isContentVisible, setIsContentVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setDepartments(initialData.departments);
      setIsContentVisible(true);
    }, 100);
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

  // Add batch
  const handleAddBatch = (deptId) => {
    setDepartments(
      departments.map((dept) =>
        dept.id === deptId && dept.newBatchName.trim()
          ? {
              ...dept,
              batches: [
                ...dept.batches,
                { id: Date.now(), name: dept.newBatchName },
              ],
              newBatchName: "",
              showBatchInput: false,
            }
          : dept
      )
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
                    placeholder="Batch name"
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
                  <span>{batch.name}</span>

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

        <a
          href="/group"
          className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[#4A0D8D] text-white font-bold hover:bg-[#6A00F4] transition-all"
        >
          Next →
        </a>
      </div>

    </AppLayout>
  );
}
