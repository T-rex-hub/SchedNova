

import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Building,
  DoorClosed,
  Layers,
  Play
} from "lucide-react";

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {

  const navItems = [
    { label: "Add Periods", icon: <LayoutDashboard className="w-5 h-5" />, link: "/add-periods" },
    { label: "Rooms", icon: <DoorClosed className="w-5 h-5" />, link: "/rooms" },
    { label: "Departments", icon: <Building className="w-5 h-5" />, link: "/departments" },
    { label: "Teachers", icon: <Users className="w-5 h-5" />, link: "/teacher" },
    { label: "Batches", icon: <Layers className="w-5 h-5" />, link: "/batch" },
    { label: "Groups", icon: <Users className="w-5 h-5" />, link: "/group" },
    { label: "Generate Timetable", icon: <Play className="w-5 h-5" />, link: "/generate-final-timetable" }
  ];

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <motion.aside
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed md:static top-0 left-0 h-full md:h-auto w-[84vw] max-w-72 md:w-64 bg-[#5523AB] p-5 md:p-6 space-y-5 md:space-y-6 z-50 md:z-auto"
          >
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold tracking-wide text-yellow-400">
                Details
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden w-8 h-8 rounded-lg bg-white/10 text-white"
              >
                ×
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item, i) => (
                <motion.a
                  key={i}
                  href={item.link}
                  whileHover={{ scale: 1.02 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                    window.location.pathname === item.link
                      ? "bg-white/20 text-white"
                      : "hover:bg-white/10 text-white/85"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span className="text-sm md:text-base">{item.label}</span>
                </motion.a>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}