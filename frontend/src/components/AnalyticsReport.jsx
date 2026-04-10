import React, { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Calendar, Database, DoorClosed, Layers, Loader2, Users, FileText, Building, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "./layout/AppLayout";
import { API_BASE } from "../config/api";
import { requireValidToken } from "../utils/auth";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  ArcElement
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend, ArcElement);

async function authedFetch(url, navigate) {
  const token = requireValidToken();
  if (!token) {
    navigate("/login", { replace: true });
    throw new Error("Session expired");
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    navigate("/login", { replace: true });
    throw new Error("Session expired");
  }
  return res;
}

export default function AnalyticsReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    timetables: 0,
    departments: 0,
    subjects: 0,
    teachers: 0,
    classrooms: 0,
    batches: 0,
    groups: 0,
    periods: 0
  });

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const [ttRes, deptRes, teachRes, crRes, batchRes, grRes, perRes] = await Promise.all([
          authedFetch(`${API_BASE}/timetables`, navigate),
          authedFetch(`${API_BASE}/departments/with-subjects`, navigate),
          authedFetch(`${API_BASE}/teachers/`, navigate),
          authedFetch(`${API_BASE}/classrooms/list`, navigate),
          authedFetch(`${API_BASE}/batches/`, navigate),
          authedFetch(`${API_BASE}/groups/`, navigate),
          authedFetch(`${API_BASE}/timeslots/list`, navigate),
        ]);

        const timetables = await ttRes.json();
        const departments = await deptRes.json();
        const teachers = await teachRes.json();
        const classrooms = await crRes.json();
        const batches = await batchRes.json();
        const groups = await grRes.json();
        const periods = await perRes.json();

        // Count subjects by aggregating from departments
        let subjectCount = 0;
        if (Array.isArray(departments)) {
          departments.forEach(d => {
            if (d.subjects) subjectCount += d.subjects.length;
          });
        }

        setStats({
          timetables: Array.isArray(timetables) ? timetables.length : 0,
          departments: Array.isArray(departments) ? departments.length : 0,
          subjects: subjectCount,
          teachers: Array.isArray(teachers) ? teachers.length : 0,
          classrooms: Array.isArray(classrooms) ? classrooms.length : 0,
          batches: Array.isArray(batches) ? batches.length : 0,
          groups: Array.isArray(groups) ? groups.length : 0,
          periods: Array.isArray(periods) ? periods.length : 0
        });
      } catch (e) {
        console.error("Failed to load analytics data", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [navigate]);

  const statCards = [
    { title: "Saved Timetables", count: stats.timetables, icon: <FileText className="w-8 h-8 opacity-80" />, color: "bg-gradient-to-br from-emerald-400 to-teal-600" },
    { title: "Departments", count: stats.departments, icon: <Building2 className="w-8 h-8 opacity-80" />, color: "bg-gradient-to-br from-blue-400 to-indigo-600" },
    { title: "Subjects", count: stats.subjects, icon: <Database className="w-8 h-8 opacity-80" />, color: "bg-gradient-to-br from-purple-400 to-violet-600" },
    { title: "Teachers", count: stats.teachers, icon: <Users className="w-8 h-8 opacity-80" />, color: "bg-gradient-to-br from-rose-400 to-pink-600" },
    { title: "Classrooms", count: stats.classrooms, icon: <DoorClosed className="w-8 h-8 opacity-80" />, color: "bg-gradient-to-br from-amber-400 to-orange-600" },
    { title: "Batches", count: stats.batches, icon: <Layers className="w-8 h-8 opacity-80" />, color: "bg-gradient-to-br from-cyan-400 to-blue-600" },
    { title: "Groups", count: stats.groups, icon: <Users className="w-8 h-8 opacity-80" />, color: "bg-gradient-to-br from-fuchsia-400 to-purple-600" },
    { title: "Active Periods", count: stats.periods, icon: <Calendar className="w-8 h-8 opacity-80" />, color: "bg-gradient-to-br from-lime-400 to-green-600" },
  ];

  const barData = {
    labels: ['Departments', 'Subjects', 'Teachers', 'Classrooms', 'Batches', 'Periods'],
    datasets: [{
      label: 'Total Registered Entities',
      data: [stats.departments, stats.subjects, stats.teachers, stats.classrooms, stats.batches, stats.periods],
      backgroundColor: 'rgba(255, 209, 102, 0.8)',
      borderColor: 'rgba(255, 209, 102, 1)',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'white' } },
      title: { display: false }
    },
    scales: {
      x: { ticks: { color: 'rgba(255, 255, 255, 0.7)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
      y: { ticks: { color: 'rgba(255, 255, 255, 0.7)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
    }
  };

  return (
    <AppLayout hideSidebar>
      <div className="min-h-screen text-white px-3 sm:px-4 md:px-8 py-6 max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <button
            type="button"
            onClick={() => navigate("/welcome")}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-yellow-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to welcome
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-yellow-400/20 border border-yellow-400/30">
            <BarChart3 className="w-8 h-8 text-yellow-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
            <p className="text-white/60">Overview of your scheduling workspace data</p>
          </div>
        </div>

        {/* Dashboard Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/60">
            <Loader2 className="w-10 h-10 animate-spin mr-3" />
            Loading metrics...
          </div>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {statCards.map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`${card.color} rounded-2xl p-6 shadow-xl relative overflow-hidden`}
                  >
                    <div className="relative z-10">
                      <div className="text-white/80 text-sm font-medium mb-1">{card.title}</div>
                      <div className="text-4xl font-extrabold text-white">{card.count}</div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 text-white/20 transform scale-150">
                      {card.icon}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chart Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-[#2a0e60] p-6 rounded-2xl border border-white/10 shadow-lg">
                  <h3 className="text-xl font-bold mb-6 text-white">Workspace Data Distribution</h3>
                  <Bar data={barData} options={barOptions} />
                </div>
                
                <div className="bg-[#2a0e60] p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4 shadow-lg shadow-yellow-500/20">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-5xl font-extrabold mb-2">{stats.timetables}</h2>
                  <p className="text-white/60 font-medium text-lg">Total Timetables Created</p>
                  <p className="text-white/40 mt-4 text-sm px-4">
                    Generate more timetables to increase schedule optimization and eliminate clashes.
                  </p>
                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </AppLayout>
  );
}
