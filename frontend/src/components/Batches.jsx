import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Layers,
  BookOpen,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import AppLayout from "./layout/AppLayout";

const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
};

function SubjectPill({ active, label, sublabel, onToggle, size = "md" }) {
  const sizeCls =
    size === "sm"
      ? "px-2.5 py-1 text-[11px]"
      : "px-3.5 py-2 text-xs sm:text-sm";
  return (
    <button
      type="button"
      title={sublabel || label}
      onClick={onToggle}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-purple-900
        ${sizeCls}
        ${
          active
            ? "bg-yellow-400/15 border-yellow-400/80 text-yellow-50 shadow-[0_0_20px_-8px_rgba(250,204,21,0.5)]"
            : "bg-purple-950/50 border-white/10 text-white/65 hover:border-white/25 hover:bg-purple-900/60 hover:text-white/90"
        }
      `}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${active ? "bg-yellow-400" : "bg-white/25"}`}
      />
      {label}
    </button>
  );
}

export default function BatchAdd() {
  const [departments, setDepartments] = useState([]);
  const [isContentVisible, setIsContentVisible] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://127.0.0.1:8000/departments/with-subjects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const formatted = data.map((dept) => ({
          id: dept.department_id,
          name: dept.department_name,
          subjects: Array.isArray(dept.subjects)
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
    if (isContentVisible) saveData({ departments });
  }, [departments, saveData, isContentVisible]);

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
          name,
          subjects: [],
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

  const handleRemoveBatch = (deptId, batchId) => {
    setDepartments(
      departments.map((dept) =>
        dept.id === deptId
          ? { ...dept, batches: dept.batches.filter((b) => b.id !== batchId) }
          : dept
      )
    );
  };

  const assignSubjectsToBatches = (deptId) => {
    setDepartments(
      departments.map((dept) => {
        if (dept.id !== deptId) return dept;
        const ids = [...(dept.selectedSubjects || [])];
        return {
          ...dept,
          batches: dept.batches.map((batch) => ({
            ...batch,
            subjects: [...ids],
          })),
        };
      })
    );
  };

  const toggleDeptSubject = (deptId, subjectId) => {
    const sid = Number(subjectId);
    setDepartments(
      departments.map((dept) => {
        if (dept.id !== deptId) return dept;
        const cur = new Set((dept.selectedSubjects || []).map(Number));
        if (cur.has(sid)) cur.delete(sid);
        else cur.add(sid);
        return { ...dept, selectedSubjects: Array.from(cur) };
      })
    );
  };

  const toggleBatchSubject = (deptId, batchId, subjectId) => {
    const sid = Number(subjectId);
    setDepartments(
      departments.map((dept) => {
        if (dept.id !== deptId) return dept;
        return {
          ...dept,
          batches: dept.batches.map((b) => {
            if (b.id !== batchId) return b;
            const cur = new Set((b.subjects || []).map(Number));
            if (cur.has(sid)) cur.delete(sid);
            else cur.add(sid);
            return { ...b, subjects: Array.from(cur) };
          }),
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
            subjects: (batch.subjects || [])
              .map((id) => Number(id))
              .filter((n) => !Number.isNaN(n)),
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
      <AnimatePresence>
        {isContentVisible && (
          <motion.div
            key="batches-root"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto space-y-10 p-6 md:p-8"
          >
            <header className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-purple-600/30 border border-yellow-400/30 mb-1">
                <Layers className="w-7 h-7 text-yellow-300" strokeWidth={1.75} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Batch management
              </h1>
              <p className="text-sm md:text-base text-white/55 max-w-md mx-auto leading-relaxed">
                Create batches per department, attach subjects with one tap, then continue to groups.
              </p>
            </header>

            <div className="space-y-8">
              {departments.map((dept, deptIdx) => (
                <motion.section
                  key={dept.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: deptIdx * 0.06, duration: 0.35 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-purple-800/45 to-purple-950/40 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.6)] backdrop-blur-md"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 via-yellow-400/60 to-transparent rounded-l-2xl" />

                  <div className="p-6 md:p-7 pl-7 md:pl-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2 text-yellow-400/90 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          Department
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">
                          {dept.name}
                        </h2>
                        <p className="text-sm text-white/45 mt-1">
                          {(dept.subjects || []).length} subject
                          {(dept.subjects || []).length !== 1 ? "s" : ""} ·{" "}
                          {dept.batches.length} batch
                          {dept.batches.length !== 1 ? "es" : ""}
                        </p>
                      </div>
                      <motion.button
                        type="button"
                        onClick={() =>
                          setDepartments(
                            departments.map((d) =>
                              d.id === dept.id
                                ? { ...d, showBatchInput: !d.showBatchInput }
                                : d
                            )
                          )
                        }
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 text-purple-950 font-semibold text-sm shadow-lg shadow-yellow-400/15 hover:bg-yellow-300 transition-colors"
                      >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        Add batch
                      </motion.button>
                    </div>

                    {/* Quick assign */}
                    <div className="rounded-xl border border-white/8 bg-purple-950/35 p-4 md:p-5 mb-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-400/20">
                          <BookOpen className="w-4 h-4 text-purple-200" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white">
                            Quick assign to all batches
                          </h3>
                          <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                            Tap subjects to select, then apply the same set to every batch below.
                          </p>
                        </div>
                      </div>

                      {(dept.subjects || []).length === 0 ? (
                        <p className="text-sm text-white/40 italic py-2">
                          No subjects yet — add them in Departments first.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {(dept.subjects || []).map((subj) => {
                            const sid = Number(subj.subject_id);
                            const active = (dept.selectedSubjects || [])
                              .map(Number)
                              .includes(sid);
                            return (
                              <SubjectPill
                                key={subj.subject_id}
                                active={active}
                                label={subj.subject_code}
                                sublabel={subj.subject_name}
                                onToggle={() => toggleDeptSubject(dept.id, subj.subject_id)}
                              />
                            );
                          })}
                        </div>
                      )}

                      <motion.button
                        type="button"
                        onClick={() => assignSubjectsToBatches(dept.id)}
                        disabled={
                          !dept.batches.length || !(dept.selectedSubjects || []).length
                        }
                        whileHover={
                          dept.batches.length && (dept.selectedSubjects || []).length
                            ? { scale: 1.01 }
                            : {}
                        }
                        whileTap={
                          dept.batches.length && (dept.selectedSubjects || []).length
                            ? { scale: 0.99 }
                            : {}
                        }
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                          bg-white/10 text-white border border-white/15 hover:bg-white/15
                          disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white/10"
                      >
                        Apply to all batches
                        <ChevronRight className="w-4 h-4 opacity-80" />
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {dept.showBatchInput && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6 overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-purple-900/40 border border-purple-500/25">
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
                              placeholder="e.g. CSE-A or CSE-A, CSE-B, CSE-C"
                              className="flex-1 px-4 py-3 rounded-lg bg-purple-950/60 text-white placeholder:text-white/35 border border-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/80 focus:border-transparent text-sm"
                            />
                            <motion.button
                              type="button"
                              onClick={() => handleAddBatch(dept.id)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-6 py-3 rounded-lg bg-yellow-400 text-purple-950 font-bold text-sm whitespace-nowrap"
                            >
                              Create
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Batches */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">
                        Batches
                      </h3>
                      {dept.batches.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/15 bg-purple-950/20 py-12 px-4 text-center">
                          <Layers className="w-10 h-10 text-white/20 mx-auto mb-3" />
                          <p className="text-sm text-white/45">
                            No batches yet. Use{" "}
                            <span className="text-yellow-400/90 font-medium">Add batch</span>{" "}
                            to create one.
                          </p>
                        </div>
                      ) : (
                        dept.batches.map((batch, i) => (
                          <motion.div
                            key={batch.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="group rounded-xl border border-white/10 bg-purple-900/25 hover:bg-purple-900/35 hover:border-white/15 transition-colors p-4 md:p-5"
                          >
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-yellow-400/80">
                                  Batch
                                </span>
                                <p className="text-lg font-bold text-white mt-0.5">
                                  {batch.name}
                                </p>
                              </div>
                              <motion.button
                                type="button"
                                onClick={() => handleRemoveBatch(dept.id, batch.id)}
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                className="p-2 rounded-lg text-red-400/90 hover:bg-red-500/15 border border-transparent hover:border-red-500/25 transition-colors"
                                aria-label={`Remove ${batch.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>

                            <p className="text-[11px] font-medium text-white/40 uppercase tracking-wide mb-2">
                              Subjects for this batch
                            </p>
                            {(dept.subjects || []).length === 0 ? (
                              <p className="text-xs text-white/35">
                                Add subjects under Departments.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {(dept.subjects || []).map((subj) => {
                                  const sid = Number(subj.subject_id);
                                  const active = (batch.subjects || [])
                                    .map(Number)
                                    .includes(sid);
                                  return (
                                    <SubjectPill
                                      key={`${batch.id}-${subj.subject_id}`}
                                      size="sm"
                                      active={active}
                                      label={subj.subject_code}
                                      sublabel={subj.subject_name}
                                      onToggle={() =>
                                        toggleBatchSubject(
                                          dept.id,
                                          batch.id,
                                          subj.subject_id
                                        )
                                      }
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.section>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4">
              <motion.a
                href="/teacher"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex justify-center items-center gap-2 px-6 py-3 rounded-xl bg-purple-950/80 text-white font-semibold border border-white/10 hover:bg-purple-900/80 transition-colors text-sm"
              >
                ← Previous
              </motion.a>
              <motion.button
                type="button"
                onClick={handleNext}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex justify-center items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[#4A0D8D] to-[#6A00F4] text-white font-bold shadow-lg shadow-purple-900/40 text-sm"
              >
                Next →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
