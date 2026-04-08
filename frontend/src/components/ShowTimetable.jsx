import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Printer, LoaderCircle, ArrowLeft } from "lucide-react";
import AppLayout from "./layout/AppLayout";
import { API_BASE } from "../config/api";

const tailwindColors = [
  "red",
  "sky",
  "amber",
  "green",
  "teal",
  "indigo",
  "pink",
  "purple",
  "lime",
  "cyan",
  "rose",
];

const getColorClasses = (color) =>
  `bg-${color}-500/20 border-${color}-500 text-${color}-200`;

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Solver emits one row per occupied timeslot. For duration>1 the same session
 * appears in consecutive slots — without dedup it looks like two lectures "together".
 */
function dedupeContinuousLectures(lectures) {
  const dayRank = (d) => {
    const i = DAY_ORDER.indexOf(d);
    return i === -1 ? 99 : i;
  };
  const sorted = [...lectures].sort((a, b) => {
    const da = dayRank(a.day) - dayRank(b.day);
    if (da !== 0) return da;
    return (a.slotIndex ?? 0) - (b.slotIndex ?? 0);
  });
  const out = [];
  let prev = null;
  for (const lec of sorted) {
    const cont =
      prev &&
      lec.batchId === prev.batchId &&
      lec.subject === prev.subject &&
      lec.teacher === prev.teacher &&
      lec.room === prev.room &&
      lec.day === prev.day &&
      typeof lec.slotIndex === "number" &&
      typeof prev.slotIndex === "number" &&
      lec.slotIndex === prev.slotIndex + 1;
    if (!cont) out.push(lec);
    prev = lec;
  }
  return out;
}

function buildViewModelFromPayload(timetablePayload) {
  const meta = timetablePayload.timeslots_meta || [];
  const lookups = timetablePayload.display_lookups || {};
  const schedule = timetablePayload.schedule || [];

  if (!meta.length) {
    return null;
  }

  const daysSet = new Set(meta.map((m) => m.day_of_week));
  const days = DAY_ORDER.filter((d) => daysSet.has(d));

  const slotNums = [...new Set(meta.map((m) => m.slot_number))].sort(
    (a, b) => a - b
  );
  const periodLabelBySlot = {};
  meta.forEach((m) => {
    if (periodLabelBySlot[m.slot_number] === undefined) {
      const s = String(m.start_time || "").trim();
      const e = String(m.end_time || "").trim();
      periodLabelBySlot[m.slot_number] =
        s && e ? `${s} - ${e}` : m.label?.replace("-", " - ") || `Slot ${m.slot_number}`;
    }
  });
  const periods = slotNums.map((sn) => periodLabelBySlot[sn]);

  const idxToCell = {};
  meta.forEach((m) => {
    idxToCell[m.index] = {
      day: m.day_of_week,
      time: periodLabelBySlot[m.slot_number],
    };
  });

  const lectures = [];
  schedule.forEach((row, i) => {
    const t = row.timeslot;
    const cell = idxToCell[t];
    if (!cell) return;
    const sid = row.subject;
    const tid = row.teacher;
    lectures.push({
      id: i + 1,
      batchId: String(row.batch),
      day: cell.day,
      time: cell.time,
      slotIndex: typeof t === "number" ? t : Number(t),
      subject:
        lookups.subjects?.[sid] ??
        lookups.subjects?.[String(sid)] ??
        `Subject ${sid}`,
      teacher:
        lookups.teachers?.[tid] ??
        lookups.teachers?.[String(tid)] ??
        `Teacher ${tid}`,
      room: row.room,
    });
  });

  const departments = Object.entries(lookups.departments || {}).map(
    ([id, name]) => ({
      id: String(id),
      name,
    })
  );

  const batches = Object.entries(lookups.batches || {}).map(([id, name]) => ({
    id: String(id),
    name,
    departmentId: String(lookups.batch_department?.[id] ?? ""),
  }));

  return { departments, days, periods, batches, lectures };
}

export default function ShowTimetable() {
  const [timetableData, setTimetableData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(window.location.search);
        const tid =
          params.get("timetable_id") ||
          sessionStorage.getItem("lastTimetableId");

        if (!tid) {
          setError(
            "No timetable selected. Generate one from the previous step first."
          );
          setTimetableData(null);
          return;
        }

        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/timetable/${tid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error || "Could not load this timetable.");
          setTimetableData(null);
          return;
        }

        const payload = data.timetable || data;
        const vm = buildViewModelFromPayload(payload);

        if (!vm) {
          setError(
            "This timetable has no period metadata. Generate a new timetable from the app."
          );
          setTimetableData(null);
          return;
        }

        const subjectColorMap = new Map();
        let colorIndex = 0;
        const deduped = dedupeContinuousLectures(vm.lectures);
        const lecturesWithColors = deduped.map((lecture) => {
          if (!subjectColorMap.has(lecture.subject)) {
            const colorName = tailwindColors[colorIndex % tailwindColors.length];
            subjectColorMap.set(lecture.subject, getColorClasses(colorName));
            colorIndex += 1;
          }
          return {
            ...lecture,
            color: subjectColorMap.get(lecture.subject),
          };
        });

        setTimetableData({ ...vm, lectures: lecturesWithColors });

        if (vm.departments.length > 0) {
          setSelectedDepartment(vm.departments[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load timetable. Check the API and try again.");
        setTimetableData(null);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const filteredBatches = useMemo(() => {
    if (!timetableData?.batches || !selectedDepartment) return [];
    return timetableData.batches.filter(
      (batch) => batch.departmentId === selectedDepartment
    );
  }, [selectedDepartment, timetableData]);

  useEffect(() => {
    if (filteredBatches.length > 0) {
      setSelectedBatch(filteredBatches[0].id);
    } else {
      setSelectedBatch("");
    }
  }, [filteredBatches]);

  const handlePrint = () => {
    window.print();
  };

  const filteredLectures = useMemo(() => {
    if (!timetableData?.lectures || !selectedBatch) return [];
    return timetableData.lectures.filter(
      (lecture) => lecture.batchId === selectedBatch
    );
  }, [selectedBatch, timetableData]);

  const renderTimetable = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-white">
          <LoaderCircle className="w-12 h-12 animate-spin mb-4" />
          <p className="text-xl">Loading Timetable...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-400 font-bold text-xl p-8">
          {error}
        </div>
      );
    }

    if (!timetableData || timetableData.departments.length === 0) {
      return (
        <div className="text-center text-yellow-400 font-bold text-xl p-8">
          No timetable data available.
        </div>
      );
    }

    const { days, periods } = timetableData;

    return (
      <>
        <div className="hidden md:block overflow-x-auto">
          <div
            className="timetable-grid gap-1 text-center text-sm"
            style={{ "--day-count": days.length }}
          >
            <div className="p-3 font-semibold rounded-tl-lg bg-purple-800/80 sticky left-0 z-10">
              Time
            </div>
            {days.map((day) => (
              <div key={day} className="p-3 font-semibold bg-purple-800/80">
                {day}
              </div>
            ))}
            {periods.map((time) => (
              <React.Fragment key={time}>
                <div className="p-3 font-semibold bg-purple-800/80 sticky left-0 z-10">
                  {time}
                </div>
                {days.map((day) => {
                  const cellLectures = filteredLectures.filter(
                    (l) => l.day === day && l.time === time
                  );
                  const lecture = cellLectures[0];
                  return (
                    <div
                      key={`${day}-${time}`}
                      className={`p-2 rounded-md min-h-[100px] flex items-center justify-center ${
                        lecture
                          ? `${lecture.color} border`
                          : "bg-purple-800/40"
                      }`}
                    >
                      {cellLectures.length > 0 && (
                        <div className="flex flex-col gap-2 text-left w-full p-1">
                          {cellLectures.length > 1 && (
                            <p className="text-[10px] text-amber-200/90 font-semibold">
                              Multiple entries in this slot — check data or regenerate.
                            </p>
                          )}
                          {cellLectures.map((lec) => (
                            <motion.div
                              key={lec.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex flex-col"
                            >
                              <p className="text-[10px] text-white/55 mb-1">
                                {lec.day} | {lec.time}
                              </p>
                              <p className="font-bold text-white text-xs">
                                {lec.subject}
                              </p>
                              <p className="text-white/80 text-xs">
                                {lec.teacher}
                              </p>
                              <p className="text-yellow-300/90 text-xs font-semibold mt-1">
                                Room: {lec.room}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="block md:hidden space-y-4">
          {days.map((day) => {
            const dayLectures = filteredLectures
              .filter((l) => l.day === day)
              .sort((a, b) => a.time.localeCompare(b.time));
            if (dayLectures.length === 0) return null;
            return (
              <div key={day} className="bg-purple-800/60 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-yellow-400 mb-3 border-b border-yellow-400/30 pb-2">
                  {day}
                </h3>
                <div className="space-y-3">
                  {dayLectures.map((lecture) => (
                    <motion.div
                      key={lecture.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        lecture.color?.split(" ")[1] || "border-purple-500"
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-[10px] text-white/55 mb-1">
                        {lecture.day} | {lecture.time}
                      </p>
                      <p className="font-bold text-white">{lecture.subject}</p>
                      <p className="text-sm text-white/80">{lecture.teacher}</p>
                      <p className="text-sm text-yellow-300/90 font-semibold mt-1">
                        Room: {lecture.room}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <AppLayout hideSidebar>
      <div className="printable-area">
        <main className="flex-1 p-2 sm:p-3 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto"
          >
            <div className="p-3 sm:p-4 md:p-6 bg-purple-900/50 backdrop-blur-md rounded-xl shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 mb-6 no-print">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <h2 className="text-2xl font-bold text-white">
                    Class Timetable
                  </h2>
                  <p className="text-xs text-white/45 mt-1 max-w-xl">
                    Each column is a different day; each row is the same clock time. A
                    multi-period class is shown once (extra periods are not duplicated).
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-stretch lg:items-center gap-2 sm:gap-3 md:gap-4">
                  <a
                    href="/welcome"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-purple-900 font-bold hover:bg-yellow-500 transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back</span>
                  </a>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
                    <label
                      htmlFor="dept-select"
                      className="font-semibold text-white/90"
                    >
                      Department:
                    </label>
                    <select
                      id="dept-select"
                      className="min-w-0 px-3 sm:px-4 py-2 rounded-md bg-purple-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      disabled={isLoading || !timetableData}
                    >
                      {timetableData?.departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
                    <label
                      htmlFor="batch-select"
                      className="font-semibold text-white/90"
                    >
                      Batch:
                    </label>
                    <select
                      id="batch-select"
                      className="min-w-0 px-3 sm:px-4 py-2 rounded-md bg-purple-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      disabled={
                        isLoading ||
                        !selectedDepartment ||
                        filteredBatches.length === 0
                      }
                    >
                      {filteredBatches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-purple-900 font-bold hover:bg-yellow-500 transition disabled:opacity-50"
                    disabled={isLoading || error}
                  >
                    <Printer className="w-5 h-5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
              {renderTimetable()}
            </div>
          </motion.div>
        </main>
        <style>{`
          .timetable-grid {
            display: grid;
            grid-template-columns: auto repeat(var(--day-count, 5), minmax(0, 1fr));
            min-width: 800px;
          }
          @media print {
            .no-print { display: none !important; }
            body, .printable-area { background: white !important; color: black !important; }
            .printable-area * { color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .printable-area .p-6 { padding: 1rem !important; }
            .printable-area .bg-purple-900\\/50,
            .printable-area .bg-purple-800\\/80,
            .printable-area .bg-purple-800\\/40 { background-color: #f9fafb !important; }
            .printable-area .border { border: 1px solid #e5e7eb !important; }
            .printable-area .text-white, .printable-area .text-white\\/80, .printable-area .text-yellow-300\\/90, .printable-area .font-bold { color: black !important; }
            .printable-area .min-h-\\[100px\\] { min-height: 80px !important; }
          }
        `}</style>
      </div>
    </AppLayout>
  );
}
