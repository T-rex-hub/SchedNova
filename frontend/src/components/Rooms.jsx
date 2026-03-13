import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Settings,
  MapPin,
  Save,
  Loader2,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import AppLayout from "./layout/AppLayout";

// --- Constants ---
const COLORS = ["#FFD166", "#1D9AF0", "#FF6B6B", "#06D6A0", "#6A00F4", "#F79C66", "#9D4EDD", "#EF476F"];
const INITIAL_ROOM_TYPES = ["Lecture Hall"];


export default function App() {
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState(INITIAL_ROOM_TYPES);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState([]);
  const [roomNames, setRoomNames] = useState({});
  const [showAddRoomSection, setShowAddRoomSection] = useState(false);
  const [newRoomType, setNewRoomType] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Navigation Logic
  let navigate;
  try { navigate = useNavigate(); } catch (e) { navigate = (path) => console.log("Navigate to:", path); }

  const handlePrevious = () => navigate("/add-periods");
  const handleNext = () => navigate("/departments");

  const saveToFirestore = async (newRooms) => {
   const token = localStorage.getItem("token");
    if (!token) {
      alert("Not authenticated");
      return false;
    }
    console.log("ROOM TOKEN:", token);

    // Guard: do not call backend if no rooms provided
    if (!Array.isArray(newRooms) || newRooms.length === 0) {
      console.warn("No rooms to save, skipping API call");
      return true;
    }

    const payload = newRooms.map((room) => ({
      room_code: room.name,
      classroom_type: room.type.toLowerCase().replaceAll(" ", "_"),
    
    }));


    const res = await fetch("http://127.0.0.1:8000/classrooms/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rooms: payload }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Room save failed:", err);
      alert("Failed to save rooms");
      return false;
    }

    return true;
  };

  const handleRoomNameChange = (type, value) => {
    setRoomNames(prev => ({ ...prev, [type]: value }));
  };

  const handleToggleRoomType = (type) => {
    setSelectedRoomTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleAddRooms = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const generatedRooms = [];
    selectedRoomTypes.forEach((type) => {
      const names = roomNames[type]?.split(",").map((n) => n.trim()).filter(Boolean);
      names?.forEach((name) => {
        generatedRooms.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: String(name),
          type: String(type),
          color: COLORS[(rooms.length + generatedRooms.length) % COLORS.length],
        });
      });
    });

    if (generatedRooms.length === 0) return;

    const updatedRooms = [...rooms, ...generatedRooms];
    setRooms(updatedRooms);
    const ok = await saveToFirestore(updatedRooms);
if (!ok) return;

    // Reset UI
    setSelectedRoomTypes([]);
    setRoomNames({});
    setShowAddRoomSection(false);
  };

  const removeRoom = async (id) => {
    const updated = rooms.filter(r => r.id !== id);
    setRooms(updated);
    // Persistence handled only on add
  };

  const addNewCategory = async () => {
    const typeStr = newRoomType.trim();
    if (!typeStr || roomTypes.includes(typeStr)) return;
    const updatedTypes = [...roomTypes, typeStr];
    setRoomTypes(updatedTypes);
    setNewRoomType("");
    await saveToFirestore(null, updatedTypes);
  };

  const removeCategory = async (typeToRemove) => {
    const updatedTypes = roomTypes.filter(t => t !== typeToRemove);
    setRoomTypes(updatedTypes);
    setSelectedRoomTypes(prev => prev.filter(t => t !== typeToRemove));
    await saveToFirestore(null, updatedTypes);
  };
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-8 bg-purple-900/50 backdrop-blur-md rounded-xl shadow-lg">
        
        {/* Main Content Area */}
        <div className="space-y-8 p-8 bg-purple-900/70 backdrop-blur-md rounded-xl shadow-lg">
          
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Rooms Management</h3>
              <p className="text-purple-300 text-sm opacity-80">Organize and assign campus spaces</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddRoomSection(!showAddRoomSection)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg ${
                showAddRoomSection ? "bg-red-500/90 hover:bg-red-500 text-white" : "bg-yellow-400 hover:bg-yellow-300 text-purple-900"
              }`}
            >
              {showAddRoomSection ? <X size={20} /> : <Plus size={20} />}
              {showAddRoomSection ? "Cancel" : "Add Room"}
            </button>
          </div>

          <AnimatePresence>
            {showAddRoomSection && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-purple-800/30 border border-purple-400/20 rounded-2xl overflow-hidden shadow-inner"
              >
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    
                    {/* Step 1: Manage Categories */}
                    <div className="space-y-5">
                      <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                        <Settings size={14} strokeWidth={3} /> Step 1: Manage Categories
                      </h4>
                      <div className="flex gap-2">
                        <input
                          value={newRoomType}
                          onChange={(e) => setNewRoomType(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addNewCategory()}
                          placeholder="e.g. Computer Lab"
                          className="flex-1 px-4 py-3 rounded-xl bg-purple-950/80 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:ring-2 ring-yellow-400/50"
                        />
                        <button type="button" onClick={addNewCategory} className="bg-yellow-400 text-purple-900 p-3 rounded-xl hover:bg-yellow-300 transition-colors">
                          <Plus size={22} strokeWidth={3} />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2.5">
                        {roomTypes.map((type) => (
                          <div key={type} className="group relative">
                            <button
                              type="button"
                              onClick={() => handleToggleRoomType(type)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-bold text-sm ${
                                selectedRoomTypes.includes(type)
                                  ? "bg-yellow-400 border-yellow-400 text-purple-900"
                                  : "bg-purple-900/50 border-purple-700 text-purple-100 hover:border-purple-400"
                              }`}
                            >
                              {selectedRoomTypes.includes(type) && <Check size={16} strokeWidth={3} />}
                              {String(type)}
                            </button>
                            {!selectedRoomTypes.includes(type) && (
                              <button
                                type="button"
                                onClick={() => removeCategory(type)}
                                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 rounded-full p-1 text-white shadow-md transition-opacity"
                              >
                                <X size={10} strokeWidth={4} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Define Room Names */}
                    <div className="space-y-5">
                      <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={14} strokeWidth={3} /> Step 2: Define Room Names
                      </h4>
                      {selectedRoomTypes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-purple-700 rounded-xl opacity-40">
                          <p className="text-sm">Select categories to start naming</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {selectedRoomTypes.map((type) => (
                            <div key={type} className="space-y-1.5">
                              <label className="text-[10px] font-black text-purple-300 uppercase px-1">{String(type)} Names</label>
                              <input
                                placeholder="101, 102 (separate by comma)"
                                value={roomNames[type] || ""}
                                onChange={(e) => handleRoomNameChange(type, e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-purple-950/80 border border-purple-700 text-white placeholder-purple-500 focus:outline-none focus:ring-1 ring-yellow-400/50"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Changes Part */}
                  {selectedRoomTypes.length > 0 && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => handleAddRooms(e)}
                      className="w-full bg-yellow-400 text-purple-900 py-4 rounded-xl font-black text-lg hover:bg-yellow-300 transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/20"
                    >
                      <Save size={22} strokeWidth={2.5} />
                      Save Changes to Inventory
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search and Inventory */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-purple-700"></div>
              <h4 className="text-xl font-bold whitespace-nowrap flex items-center gap-3">
                Inventory <span className="text-xs py-1 px-2.5 bg-white/10 rounded-lg text-yellow-400">{rooms.length}</span>
              </h4>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-purple-700"></div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4 text-purple-300">
                <Loader2 className="animate-spin text-yellow-400" size={32} />
                <p className="text-sm font-medium">Syncing with cloud...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-16 px-6 border-2 border-dashed border-purple-800 rounded-3xl opacity-60">
                <Building2 size={48} className="mx-auto mb-4 text-purple-400 opacity-20" />
                <p className="text-purple-300 italic">Your inventory is currently empty.</p>
                <p className="text-[10px] text-purple-400 mt-2 uppercase font-bold tracking-widest">Add rooms using the button above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {rooms.map((room) => (
                    <motion.div
                      key={room.id}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="group flex justify-between items-center bg-purple-900/60 p-5 rounded-2xl border-l-4 shadow-lg hover:shadow-purple-950/50 transition-all border border-white/5"
                      style={{ borderLeftColor: room.color }}
                    >
                      <div className="space-y-0.5">
                        <p className="font-black text-white text-lg leading-tight">{String(room.name)}</p>
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-tighter opacity-80">{String(room.type)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRoom(room.id)}
                        className="p-2.5 bg-red-500/0 hover:bg-red-500 text-purple-400 hover:text-white rounded-xl transition-all shadow-none hover:shadow-lg hover:shadow-red-500/30"
                      >
                        <Trash2 size={18} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4">
          <button
            type="button"
            onClick={handlePrevious}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-purple-800/80 hover:bg-purple-700 text-white font-black transition-all shadow-xl border border-white/5 active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={3} />
            PREVIOUS
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-purple-800/80 hover:bg-purple-700 text-white font-black transition-all shadow-xl border border-white/5 active:scale-95"
          >
            NEXT
            <ArrowRight size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </AppLayout>
  );
}

// Fallback for icons if building icon isn't imported
const Building2 = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
  </svg>
);