

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
        <motion.aside
          initial={{ x: -250, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -250, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-64 bg-[#5523AB] p-6 space-y-6 relative hidden md:block"
        >
          <h1 className="text-2xl font-bold tracking-wide text-yellow-400">
            Details
          </h1>

          <nav className="space-y-2">
            {navItems.map((item, i) => (
              <motion.a
                key={i}
                href={item.link}
                whileHover={{ scale: 1.05 }}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  window.location.pathname === item.link
                    ? "bg-white/20 text-white"
                    : "hover:bg-white/10 text-white/80"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </motion.a>
            ))}
          </nav>

          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-1/2 -right-4 w-8 h-8 bg-[#3B0D91] text-white rounded-full flex items-center justify-center"
          >
            {"<"}
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}