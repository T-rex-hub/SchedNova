import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Trash2,
  Eye,
  ArrowLeft,
  Loader2,
  FileText,
  RefreshCw,
  X,
} from "lucide-react";
import AppLayout from "./layout/AppLayout";
import { API_BASE } from "../config/api";

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function SavedTimetables() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const deleteTimetableById = useCallback(async (token, id) => {
    const endpoints = [`${API_BASE}/timetable/${id}`, `${API_BASE}/timetables/${id}`];
    let lastError = null;

    for (const url of endpoints) {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) return { ok: true, alreadyGone: false };

      // If route exists but item is gone, treat as success for UI consistency.
      if (res.status === 404) return { ok: true, alreadyGone: true };

      // 405 usually means wrong endpoint shape; try next fallback route.
      if (res.status === 405) {
        lastError = new Error("Method not allowed");
        continue;
      }

      const err = await res.json().catch(() => ({}));
      lastError = new Error(err.detail || `HTTP ${res.status}`);
      break;
    }

    throw lastError || new Error("Delete failed");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/timetables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load timetables");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (timetableId) => {
    setDeletingId(timetableId);
    try {
      const token = localStorage.getItem("token");
      const out = await deleteTimetableById(token, timetableId);
      setItems((prev) => prev.filter((t) => t.timetable_id !== timetableId));
      if (
        String(sessionStorage.getItem("lastTimetableId")) ===
        String(timetableId)
      ) {
        sessionStorage.removeItem("lastTimetableId");
      }
      setNotice(out.alreadyGone ? "Timetable was already deleted." : "Timetable deleted successfully.");
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    setError(null);
    setNotice("");

    try {
      const token = localStorage.getItem("token");
      const ids = Array.isArray(items) ? items.map((t) => t.timetable_id) : [];

      // Delete sequentially to keep UI/simple error handling.
      for (const id of ids) {
        await deleteTimetableById(token, id);
      }

      setItems([]);
      sessionStorage.removeItem("lastTimetableId");
      setNotice("All timetables deleted successfully.");
      setConfirmDeleteAllOpen(false);
    } catch (e) {
      setError(e.message || "Delete all failed");
    } finally {
      setDeletingAll(false);
    }
  };

  const openTimetable = (timetableId) => {
    sessionStorage.setItem("lastTimetableId", String(timetableId));
    navigate(`/showtimetable?timetable_id=${timetableId}`);
  };

  return (
    <AppLayout hideSidebar>
      <div className="min-h-screen text-white px-4 md:px-8 py-10 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            type="button"
            onClick={() => navigate("/welcome")}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-yellow-300 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to welcome
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-purple-600/30 border border-yellow-400/25">
                <FileText className="w-8 h-8 text-yellow-300" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Saved timetables
                </h1>
                <p className="text-white/55 text-sm mt-1 max-w-md">
                  Open a generated schedule, or remove ones you no longer need.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                onClick={() => load()}
                disabled={loading || deletingAll}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </motion.button>

              <motion.button
                type="button"
                onClick={() => setConfirmDeleteAllOpen(true)}
                disabled={loading || items.length === 0 || deletingAll}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-400/30 bg-red-500/15 text-red-200 text-sm font-medium hover:bg-red-500/25 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete all
              </motion.button>
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

          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-white/50">
              <Loader2 className="w-10 h-10 animate-spin mb-3" />
              <p>Loading timetables…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 backdrop-blur py-16 px-6 text-center">
              <Calendar className="w-12 h-12 text-white/25 mx-auto mb-4" />
              <p className="text-white/60 font-medium">No saved timetables yet</p>
              <p className="text-white/40 text-sm mt-2 max-w-xs mx-auto">
                Generate one from the flow ending at{" "}
                <span className="text-yellow-400/90">Generate Timetable</span>.
              </p>
              <motion.button
                type="button"
                onClick={() => navigate("/generate-final-timetable")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="mt-6 px-5 py-2.5 rounded-xl bg-yellow-400 text-purple-950 font-semibold text-sm"
              >
                Generate timetable
              </motion.button>
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence>
                {items.map((row, i) => (
                  <motion.li
                    key={row.timetable_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-white/10 bg-gradient-to-r from-purple-900/40 to-purple-950/30 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-yellow-400/90 text-xs font-semibold uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5" />
                        Timetable #{row.timetable_id}
                      </div>
                      <p className="text-white/45 text-sm mt-1">
                        {formatWhen(row.created_at)}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/50">
                        {row.status && (
                          <span>
                            Status:{" "}
                            <span className="text-white/80">{row.status}</span>
                          </span>
                        )}
                        {typeof row.entries_count === "number" && (
                          <span>
                            {row.entries_count} class slot
                            {row.entries_count !== 1 ? "s" : ""}
                          </span>
                        )}
                        {row.solve_time != null && (
                          <span>
                            Solved in {Number(row.solve_time).toFixed(2)}s
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <motion.button
                        type="button"
                        onClick={() => openTimetable(row.timetable_id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-sm font-medium hover:bg-white/15"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => setConfirmDeleteId(row.timetable_id)}
                        disabled={deletingId === row.timetable_id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 border border-red-400/30 text-red-200 text-sm font-medium hover:bg-red-500/25 disabled:opacity-50"
                      >
                        {deletingId === row.timetable_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </motion.button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>

        {confirmDeleteId != null && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#2b1157] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">Delete timetable?</h3>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-white/70 mt-2">
                This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3 py-2 rounded-lg bg-white/10 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={deletingId === confirmDeleteId}
                  className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 text-sm disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {deletingId === confirmDeleteId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Confirm delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDeleteAllOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#2b1157] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">Delete all timetables?</h3>
                <button
                  type="button"
                  onClick={() => !deletingAll && setConfirmDeleteAllOpen(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-white/70 mt-2">
                This will permanently remove all saved timetables. This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !deletingAll && setConfirmDeleteAllOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/10 text-sm"
                  disabled={deletingAll}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={deletingAll || items.length === 0}
                  className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 text-sm disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {deletingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Confirm delete all"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
