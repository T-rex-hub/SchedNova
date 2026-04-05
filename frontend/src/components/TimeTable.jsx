import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import AppLayout from "./layout/AppLayout";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000";

export default function TimeTable() {
  const [loading, setLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [errorDetail, setErrorDetail] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setIsContentVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleGenerateTimetable = async () => {
    setLoading(true);
    setGenerationStatus("Generating timetable from your saved data…");
    setIsGenerationComplete(false);
    setErrorDetail(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/solve-timetable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof data.detail === "string"
            ? data.detail
            : data.detail?.message ||
              data.detail?.detail ||
              "Could not generate timetable.";
        setGenerationStatus("Generation failed.");
        setErrorDetail(msg);
        return;
      }

      if (data.timetable_id != null) {
        sessionStorage.setItem("lastTimetableId", String(data.timetable_id));
      }

      setGenerationStatus(
        `Success. Solver finished in ${(data.timetable?.solve_time ?? 0).toFixed(2)}s.`
      );
      setIsGenerationComplete(true);
    } catch (error) {
      setGenerationStatus("Network error.");
      setErrorDetail(error?.message || "Check that the API is running.");
      console.error("Error generating timetable:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <main className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
        {isContentVisible && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto space-y-8 p-6 bg-purple-900/50 backdrop-blur-md rounded-xl shadow-lg text-center"
          >
            <h3 className="text-2xl font-semibold mb-4">
              Generate Final Timetable
            </h3>

            <p className="text-white/70 mb-8">
              Builds a timetable from your database: periods, rooms, departments,
              teachers, batches, groups, and subject assignments. Nothing here is
              hardcoded.
            </p>

            <motion.button
              onClick={handleGenerateTimetable}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-8 py-4 mx-auto rounded-lg font-bold transition-all ${
                loading
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-yellow-400 text-purple-900 hover:bg-yellow-500"
              }`}
            >
              <Play className="w-5 h-5" />
              {loading ? "Generating…" : "Generate Timetable"}
            </motion.button>

            {generationStatus && (
              <div className="mt-4 p-4 rounded-lg bg-white/10 text-white">
                {generationStatus}
              </div>
            )}

            {errorDetail && (
              <div className="mt-2 p-4 rounded-lg bg-red-900/40 text-red-100 text-sm text-left whitespace-pre-wrap">
                {errorDetail}
              </div>
            )}

            {isGenerationComplete && (
              <motion.button
                onClick={() => navigate("/showtimetable")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-6 py-3 mt-4 rounded-lg text-white font-bold transition-all bg-[#4A0D8D] hover:bg-[#6A00F4]"
              >
                Show Timetable →
              </motion.button>
            )}
          </motion.div>
        )}
      </main>

      <div className="flex justify-between mt-8 px-8">
        <a
          href="/group"
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold bg-[#4A0D8D] hover:bg-[#6A00F4]"
        >
          ← Previous
        </a>
        <span />
      </div>
    </AppLayout>
  );
}
