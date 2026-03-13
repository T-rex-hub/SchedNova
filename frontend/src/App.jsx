// src/App.jsx
import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  Layers,
  CheckCircle,
  RefreshCw,
  Twitter,
  Linkedin,
  Github,
  ArrowRight,
  X,
} from "lucide-react";
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import WelcomePage from "./components/WelcomePage";
import PeriodsAdd from "./components/PeriodsAdd";
import Departments from "./components/Departments";
import Rooms from "./components/Rooms";
import Teachers from "./components/Teachers";
import Groups from "./components/Groups";
import Batches from "./components/Batches"
import TimeTable from "./components/TimeTable";
import ShowTimetable from "./components/ShowTimeTable";

const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  return Boolean(token);
};

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function RedirectIfAuth({ children }) {
  return isAuthenticated() ? <Navigate to="/welcome" replace /> : children;
}

function Home({ openLogin, openSignup }) {
  const hoverEffect = {
    scale: 1.05,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  };

  const schedNovaColor = "#FFD166"; // yellow
  const buttonTextColor = "#1D9AF0";

  return (
    <>
      {/* Navbar */}
      <header className="flex justify-between items-center px-24 py-5 shadow-sm fixed top-0 left-0 right-0 z-50 bg-[#5523AB]">
        <h1
          className="font-bold text-3xl leading-tight m-0"
          style={{ color: "white"}}
        >
          SchedNova
        </h1>
        <nav className="hidden md:flex gap-6 text-lg font-medium">
          {["Features", "About"].map((link, i) => (
            <a
              key={i}
              href={`#${link.toLowerCase()}`}
              className="text-white hover:text-yellow-300 transition-all duration-200"
            >
              {link}
            </a>
          ))}
          <button
            className="text-white hover:text-yellow-300 transition-all duration-200"
            onClick={openLogin}
          >
            Login
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 md:px-20 min-h-screen">
        <motion.h2
          className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-lg"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Welcome to <span style={{ color: schedNovaColor }}>SchedNova</span>
        </motion.h2>

        <motion.p
          className="text-lg md:text-xl max-w-2xl mb-6"
        >
          SchedNova is a smart timetable and classroom scheduling system designed
          to minimize conflicts, save time, and improve academic productivity.
          Manage your classes with ease and innovation.
        </motion.p>

        <motion.button
          className="mt-8 px-8 py-3 rounded-full shadow-lg font-bold text-lg border border-white/30 bg-white transition"
          style={{ color: buttonTextColor }}
          onClick={openSignup}
          whileHover={{ backgroundColor: "#e0e0e0" }}
        >
          Get Started →
        </motion.button>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 md:px-20 py-16 bg-gradient-to-r from-[#3B0D91] via-[#6A00F4] to-[#1D9AF0]">
        <br></br><br></br>
        <h3 className="text-3xl font-bold text-center mb-12 text-white">
          Key Features
        </h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <Calendar className="w-10 h-10 text-white" />, title: "Optimized Scheduling", desc: "Generate clash-free timetables that maximize resource utilization." },
            { icon: <Users className="w-10 h-10 text-white" />, title: "Multi-department Support", desc: "Handle UG, PG, and cross-department electives effortlessly." },
            { icon: <Layers className="w-10 h-10 text-white" />, title: "Balanced Workload", desc: "Ensure fair distribution of classes for faculty & students." },
            { icon: <CheckCircle className="w-10 h-10 text-white" />, title: "Approval Workflow", desc: "Enable competent authorities to review and approve schedules." },
            { icon: <RefreshCw className="w-10 h-10 text-white" />, title: "Dynamic Adjustments", desc: "Easily rearrange for faculty leaves & special classes." },
          ].map((f, i) => (
            <motion.div key={i} className="p-6 bg-white/10 rounded-2xl shadow hover:shadow-xl transition" whileHover={hoverEffect}>
              {f.icon}
              <h4 className="text-xl font-semibold mt-4 mb-2 text-white">{f.title}</h4>
              <p className="text-white/80">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-6 md:px-20 py-16 text-center bg-gradient-to-r from-[#3B0D91] via-[#6A00F4] to-[#1D9AF0]">
        <h3 className="text-3xl font-bold mb-6 text-white">WHY CHOOSE US?</h3>
        <p className="max-w-3xl mx-auto text-lg text-white/90">
          Built for Higher Education under NEP 2020, SchedNova solves the challenges of manual timetable creation.
          It ensures optimized classroom utilization, reduces faculty overload, and helps achieve learning outcomes effectively.
        </p>
      </section>

      {/* Footer */}
      <footer className="bg-[#5523AB] py-10 -mt-8 text-white">
        <div className="max-w-6xl mx-auto px-6 md:px-12 grid md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h4 className="text-xl font-bold mb-3" style={{ color: schedNovaColor }}>SchedNova</h4>
            <p className="text-sm opacity-90 text-white/90">
              Intelligent, clash-free timetable scheduling for smarter university.
            </p>
          </div>

          <div>
            <h5 className="font-semibold mb-3" style={{ color: schedNovaColor }}>Quick Links</h5>
            <ul className="space-y-2 opacity-90">
              {["Features", "About"].map((link, i) => (
                <li key={i}>
                  <a
                    href={`#${link.toLowerCase()}`}
                    className="hover:text-yellow-400 transition-all duration-200 block text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-semibold mb-3" style={{ color: schedNovaColor }}>Follow Us</h5>
            <div className="flex justify-center md:justify-start gap-4">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <motion.a key={i} href="#" whileHover={hoverEffect} className="transition">
                  <Icon className="w-5 h-5 text-white" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center text-sm mt-8 border-t border-white/30 pt-4 opacity-80">
          ©️ 2025 SchedNova | Built for Smart University
        </div>
      </footer>
    </>
  );
}

export default function App() {
  const hoverEffect = {
    scale: 1.05,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  };

  const schedNovaColor = "#FFD166"; // yellow
  const buttonTextColor = "#1D9AF0";

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const openLogin = () => {
    setShowLogin(true);
    setModalOpen(true);
  };

  const openSignup = () => {
    setShowLogin(false);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <div className="font-sans min-h-screen bg-gradient-to-b from-[#3B0D91] via-[#6A00F4] to-[#1D9AF0] text-white relative">
      <Routes>
        <Route path="/" element={<Home openLogin={openLogin} openSignup={openSignup} />} />
        <Route
          path="/login"
          element={
            <RedirectIfAuth>
              <div className="flex items-center justify-center min-h-screen px-4">
                <div className="w-full max-w-md">
                  <LoginForm />
                </div>
              </div>
            </RedirectIfAuth>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuth>
              <div className="flex items-center justify-center min-h-screen px-4">
                <div className="w-full max-w-md">
                  <SignupForm />
                </div>
              </div>
            </RedirectIfAuth>
          }
        />
        <Route
          path="/welcome"
          element={
            <RequireAuth>
              <WelcomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/add-periods"
          element={
            <RequireAuth>
              <PeriodsAdd />
            </RequireAuth>
          }
        />
        <Route
          path="/departments"
          element={
            <RequireAuth>
              <Departments />
            </RequireAuth>
          }
        />

        <Route
          path="/rooms"
          element={
            <RequireAuth>
              <Rooms />
            </RequireAuth>
          }
        />

        <Route
          path="/teacher"
          element={
            <RequireAuth>
              <Teachers />
            </RequireAuth>
          }
        />

        <Route
          path="/group"
          element={
            <RequireAuth>
              <Groups />
            </RequireAuth>
          }
        />

        <Route
          path="/batch"
          element={
            <RequireAuth>
              <Batches />
            </RequireAuth>
          }
        />

        <Route
          path="/generate-final-timetable"
          element={
            <RequireAuth>
              <TimeTable />
            </RequireAuth>
          }
        />

        <Route
          path="/showtimetable"
          element={
            <RequireAuth>
              <ShowTimetable />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Modal (kept for landing page quick access) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-gradient-to-br from-[#3B0D91] via-[#6A00F4] to-[#1D9AF0] p-10 rounded-3xl w-full max-w-md relative text-white shadow-xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-yellow-300"
              onClick={closeModal}
            >
              <X className="w-6 h-6" />
            </button>

            {showLogin ? (
              <LoginForm switchToSignup={() => setShowLogin(false)} onSuccess={closeModal} />
            ) : (
              <SignupForm switchToLogin={() => setShowLogin(true)} onSuccess={closeModal}/>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}