import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  Layers,
  User,
  BookOpen,
  Settings,
  UserCircle,
  LogOut,
  Twitter,
  Linkedin,
  Github,
  ChevronDown,
  FileText,
  BarChart3,
  UserCheck
} from "lucide-react";
import AppLayout from "./layout/AppLayout";

export default function WelcomePage() {
  const username = localStorage.getItem("username");
  const schedNovaColor = "#FFD166"; // yellow accent
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hoverEffect = {
    scale: 1.2,
    transition: { type: "spring", stiffness: 400, damping: 10 },
  };

  const handleLogout = () => {
    // Navigates to the root URL, simulating a logout
    window.location.href = '/';
  };

  // Features data
  const features = [
    {
      title: "Generate Timetable",
      desc: "Create optimized timetables instantly with AI-powered scheduling.",
      icon: <Calendar className="w-10 h-10 mx-auto mb-4 text-yellow-300" />,
      link: "/add-periods",
    },
    {
      title: "Saved Timetable",
      desc: "Access and manage all your previously generated timetables in one place.",
      icon: <FileText className="w-10 h-10 mx-auto mb-4 text-yellow-300" />,
      link: "/workload",
    },
    {
      title: "Analytic & Reports",
      desc: "Visualize your schedules and track performance with detailed analytics.",
      icon: <BarChart3 className="w-10 h-10 mx-auto mb-4 text-yellow-300" />,
      link: "/resources",
    },
    {
      title: "Subtitute Teacher",
      desc: "EEasily assign substitute teachers for missed classes.",
      icon: <UserCheck className="w-10 h-10 mx-auto mb-4 text-yellow-300" />,
      link: "/courses",
    },
    
  ];

  return (
  <AppLayout hideSidebar>
    <div className="min-h-screen flex flex-col text-white justify-between">

      <div className="flex-1">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center px-6 mt-24 text-center">
          <motion.h1
            className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg tracking-wide"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            Welcome, {username || "User"} 👋
          </motion.h1>

          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            Smarter Scheduling,{" "}
            <span style={{ color: schedNovaColor }}>Simplified</span>
          </motion.h2>

          <motion.p
            className="text-lg md:text-xl max-w-2xl mb-10 text-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            Step into the future of academic planning. Let <b>SchedNova</b> handle
            the heavy lifting—so you can focus on what matters most.
          </motion.p>
        </div>

        {/* Features Section */}
        <div className="relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 px-10 md:px-20 mt-10 mb-16">
            {features.map((feature, index) => (
              <a key={index} href={feature.link}>
                <motion.div
                  className="p-8 rounded-2xl bg-white/10 backdrop-blur-md text-center shadow-lg hover:scale-105 transition cursor-pointer h-full flex flex-col justify-between"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 * (index + 1), duration: 1 }}
                >
                  {feature.icon}
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-300 text-sm">{feature.desc}</p>
                </motion.div>
              </a>
            ))}
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
);
}