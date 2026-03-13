import { motion, AnimatePresence } from "framer-motion";
import { Menu, User, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Header({ setSidebarOpen }) {

  const [profileOpen, setProfileOpen] = useState(false);
  const username = localStorage.getItem("username");

  const handleLogout = () => {
    localStorage.clear();
    window.location.replace("/");
  };

  return (
    <header className="flex justify-between items-center px-6 py-3.5 bg-[#5523AB] shadow-md">
      
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 hover:bg-white/20 rounded-lg"
          onClick={() => setSidebarOpen(prev => !prev)}
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        <a
          href="/welcome"
          className="font-bold text-3xl text-white hover:text-yellow-400 transition"
        >
          SchedNova
        </a>
      </div>

      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/20"
          onClick={() => setProfileOpen(prev => !prev)}
        >
          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">
            <User className="w-5 h-5" />
          </div>
          <span>{username || "User"}</span>
          <ChevronDown className="w-4 h-4 text-white" />
        </motion.button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="absolute right-0 mt-2 w-40 bg-[#3B0D91] shadow-lg rounded-lg overflow-hidden z-10"
            >
              <a className="block px-4 py-3 text-white hover:bg-yellow-400 hover:text-black">
                Profile
              </a>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-white hover:bg-red-600"
              >
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </header>
  );
}
