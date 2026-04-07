import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Database,
  RefreshCw,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import AppLayout from "./layout/AppLayout";
import { API_BASE } from "../config/api";
import { requireValidToken, clearAuth } from "../utils/auth";

async function authedFetch(url, navigate, options = {}) {
  const token = requireValidToken();
  if (!token) {
    clearAuth();
    navigate("/login", { replace: true });
    throw new Error("Session expired");
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    clearAuth();
    navigate("/login", { replace: true });
    throw new Error("Session expired");
  }
  return res;
}

export default function ManageData() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [selectedBySection, setSelectedBySection] = useState({});
  const [confirmState, setConfirmState] = useState({
    open: false,
    sectionKey: "",
    mode: "single", // single | bulk
    ids: [],
    title: "",
    message: "",
    items: [],
  });
  const [data, setData] = useState({
    timeslots: [],
    classrooms: [],
    departments: [],
    subjects: [],
    teachers: [],
    batches: [],
    groups: [],
    timetables: [],
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const [
        tsRes,
        roomRes,
        deptRes,
        teacherRes,
        batchRes,
        groupRes,
        ttRes,
      ] = await Promise.all([
        authedFetch(`${API_BASE}/timeslots/list`, navigate),
        authedFetch(`${API_BASE}/classrooms/list`, navigate),
        authedFetch(`${API_BASE}/departments/with-subjects`, navigate),
        authedFetch(`${API_BASE}/teachers/`, navigate),
        authedFetch(`${API_BASE}/batches/`, navigate),
        authedFetch(`${API_BASE}/groups/`, navigate),
        authedFetch(`${API_BASE}/timetables`, navigate),
      ]);

      const [timeslots, classrooms, departments, teachers, batches, groups, timetables] =
        await Promise.all([
          tsRes.json(),
          roomRes.json(),
          deptRes.json(),
          teacherRes.json(),
          batchRes.json(),
          groupRes.json(),
          ttRes.json(),
        ]);

      const subjects = (departments || []).flatMap((d) =>
        (d.subjects || []).map((s) => ({
          ...s,
          department_id: d.department_id,
          department_name: d.department_name,
        }))
      );

      setData({
        timeslots: Array.isArray(timeslots) ? timeslots : [],
        classrooms: Array.isArray(classrooms) ? classrooms : [],
        departments: Array.isArray(departments) ? departments : [],
        subjects,
        teachers: Array.isArray(teachers) ? teachers : [],
        batches: Array.isArray(batches) ? batches : [],
        groups: Array.isArray(groups) ? groups : [],
        timetables: Array.isArray(timetables) ? timetables : [],
      });
    } catch (e) {
      setError(e.message || "Failed loading data");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sections = useMemo(
    () => [
      {
        key: "departments",
        title: "Departments",
        items: data.departments,
        id: (x) => x.department_id,
        label: (x) => x.department_name,
        del: (x) => `${API_BASE}/departments/${x.department_id}`,
      },
      {
        key: "subjects",
        title: "Subjects",
        items: data.subjects,
        id: (x) => x.subject_id,
        label: (x) => `${x.subject_code} - ${x.subject_name} (${x.department_name})`,
        del: (x) => `${API_BASE}/departments/subject/${x.subject_id}`,
      },
      {
        key: "timeslots",
        title: "Periods",
        items: data.timeslots,
        id: (x) => x.timeslot_id,
        label: (x) =>
          `${x.day_of_week} P${x.slot_number}: ${x.start_time} - ${x.end_time}`,
        del: (x) => `${API_BASE}/timeslots/${x.timeslot_id}`,
      },
      {
        key: "classrooms",
        title: "Rooms",
        items: data.classrooms,
        id: (x) => x.classroom_id,
        label: (x) => `${x.room_code} (${x.classroom_type})`,
        del: (x) => `${API_BASE}/classrooms/${x.classroom_id}`,
      },
      {
        key: "teachers",
        title: "Teachers",
        items: data.teachers,
        id: (x) => x.teacher_id,
        label: (x) => x.teacher_name || `Teacher #${x.teacher_id}`,
        del: (x) => `${API_BASE}/teachers/${x.teacher_id}`,
      },
      {
        key: "batches",
        title: "Batches",
        items: data.batches,
        id: (x) => x.batch_id,
        label: (x) => `${x.batch_name} (${x.department_name || "Department"})`,
        del: (x) => `${API_BASE}/batches/${x.batch_id}`,
      },
      {
        key: "groups",
        title: "Fixed Groups",
        items: data.groups,
        id: (x) => x.group_id,
        label: (x) =>
          `${x.group_name} [${(x.room_types || []).join(", ")}]`,
        del: (x) => `${API_BASE}/groups/${x.group_id}`,
      },
      {
        key: "timetables",
        title: "Saved Timetables",
        items: data.timetables,
        id: (x) => x.timetable_id,
        label: (x) => `Timetable #${x.timetable_id}`,
        del: (x) => `${API_BASE}/timetable/${x.timetable_id}`,
      },
    ],
    [data]
  );

  const toggleSelect = (sectionKey, id) => {
    setSelectedBySection((prev) => {
      const current = new Set(prev[sectionKey] || []);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      return { ...prev, [sectionKey]: Array.from(current) };
    });
  };

  const toggleSelectAll = (sectionKey, ids) => {
    setSelectedBySection((prev) => {
      const current = new Set(prev[sectionKey] || []);
      const allSelected = ids.every((id) => current.has(id));
      return {
        ...prev,
        [sectionKey]: allSelected ? [] : ids,
      };
    });
  };

  const askDeleteSingle = (section, item) => {
    const id = section.id(item);
    setConfirmState({
      open: true,
      sectionKey: section.key,
      mode: "single",
      ids: [id],
      title: `Delete 1 ${section.title.slice(0, -1) || "item"}?`,
      message: section.label(item),
      items: [item],
    });
  };

  const askDeleteBulk = (section, items) => {
    setConfirmState({
      open: true,
      sectionKey: section.key,
      mode: "bulk",
      ids: items.map((x) => section.id(x)),
      title: `Delete ${items.length} ${section.title}?`,
      message: "This action cannot be undone.",
      items,
    });
  };

  const doDelete = async () => {
    const { sectionKey, mode, ids, items } = confirmState;
    if (!sectionKey || !ids.length) return;
    const busy = `${sectionKey}:${mode === "single" ? ids[0] : "bulk"}`;
    setBusyKey(busy);
    setError("");
    setNotice("");
    try {
      const section = sections.find((s) => s.key === sectionKey);
      if (!section) throw new Error("Section not found");

      for (const item of items) {
        const res = await authedFetch(section.del(item), navigate, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Delete failed");
        }
      }

      setConfirmState((prev) => ({ ...prev, open: false }));
      setSelectedBySection((prev) => ({ ...prev, [sectionKey]: [] }));
      setNotice(
        mode === "single"
          ? "Item deleted successfully."
          : `${items.length} items deleted successfully.`
      );
      await loadAll();
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <AppLayout hideSidebar>
      <div className="min-h-screen text-white px-4 md:px-8 py-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => navigate("/welcome")}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-yellow-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to welcome
          </button>
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-yellow-400/15 border border-yellow-400/30">
            <Database className="w-7 h-7 text-yellow-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Manage Added Data</h1>
            <p className="text-white/55 text-sm">
              View everything you added and delete records instantly.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-400/30 text-red-200 text-sm">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-sm">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/60">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            Loading data...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section, index) => (
              <motion.div
                key={section.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-xl border border-white/10 bg-purple-900/35 p-4"
              >
                {(() => {
                  const ids = section.items.map((item) => section.id(item));
                  const selected = selectedBySection[section.key] || [];
                  const selectedCount = selected.length;
                  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
                  return (
                    <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold">{section.title}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(section.key, ids)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/10 text-white/80"
                    >
                      {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      {allSelected ? "Unselect" : "Select all"}
                    </button>
                    <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/70">
                      {section.items.length}
                    </span>
                  </div>
                </div>
                {selectedCount > 0 && (
                  <div className="mb-3 p-2 rounded bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-between">
                    <span className="text-xs text-yellow-200">
                      {selectedCount} selected
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        askDeleteBulk(
                          section,
                          section.items.filter((x) => selected.includes(section.id(x)))
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/15 border border-red-400/30 text-red-200 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete selected
                    </button>
                  </div>
                )}
                {section.items.length === 0 ? (
                  <p className="text-sm text-white/40">No data</p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {section.items.map((item) => {
                      const id = section.id(item);
                      const checked = (selectedBySection[section.key] || []).includes(id);
                      const busy = busyKey === `${section.key}:${id}`;
                      return (
                        <li
                          key={id}
                          className="flex items-center justify-between gap-2 p-2 rounded bg-white/5 border border-white/10"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSelect(section.key, id)}
                            className="shrink-0 text-white/70 hover:text-white"
                          >
                            {checked ? (
                              <CheckSquare className="w-4 h-4 text-yellow-300" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <span className="text-sm text-white/85 truncate flex-1">
                            {section.label(item)}
                          </span>
                          <button
                            type="button"
                            onClick={() => askDeleteSingle(section, item)}
                            disabled={busy}
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-red-500/15 border border-red-400/30 text-red-200 text-xs disabled:opacity-60"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Delete
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                    </>
                  );
                })()}
              </motion.div>
            ))}
          </div>
        )}

        {confirmState.open && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#2b1157] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{confirmState.title}</h3>
                <button
                  type="button"
                  onClick={() => setConfirmState((p) => ({ ...p, open: false }))}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-white/70 mt-2">{confirmState.message}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmState((p) => ({ ...p, open: false }))}
                  className="px-3 py-2 rounded-lg bg-white/10 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doDelete}
                  disabled={busyKey.includes(`${confirmState.sectionKey}:`)}
                  className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 text-sm disabled:opacity-60"
                >
                  {busyKey.includes(`${confirmState.sectionKey}:`) ? "Deleting..." : "Confirm delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
