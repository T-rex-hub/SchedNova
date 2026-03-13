import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, ChevronDown, Printer, Twitter, Linkedin, Github, LoaderCircle, ArrowLeft } from "lucide-react";
import AppLayout from "./layout/AppLayout";

// --- MOCK BACKEND DATA ---
// The 'color' property has been REMOVED from lectures. It will be generated dynamically.
const mockApiData = {
  departments: [
    { id: 'dept-cs', name: 'Computer Science' },
    { id: 'dept-ee', name: 'Electrical Engineering' },
    { id: 'dept-mech', name: 'Mechanical Engineering' },
  ],
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  periods: [
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
    "13:00 - 14:00",
    "15:00 - 16:00",
  ],
  batches: [
    { id: 'cs-btech-2023', name: 'Batch 1', departmentId: 'dept-cs' },
    { id: 'cs-btech-2024', name: 'Batch 4', departmentId: 'dept-cs' },
    { id: 'ee-btech-2023', name: 'Batch 2', departmentId: 'dept-ee' },
    { id: 'mech-btech-2022', name: 'Batch 3', departmentId: 'dept-mech' },
  ],
  lectures: [
    // Lectures for Batch 1 (cs-btech-2023)
    { id: 1, batchId: 'cs-btech-2023', day: 'Monday', time: '09:00 - 10:00', subject: 'Data Structures', teacher: 'Dr. Alan Turing', room: 'A-101' },
    { id: 2, batchId: 'cs-btech-2023', day: 'Monday', time: '10:00 - 11:00', subject: 'Algorithms', teacher: 'Dr. Ada Lovelace', room: 'A-102' },
    { id: 3, batchId: 'cs-btech-2023', day: 'Tuesday', time: '11:00 - 12:00', subject: 'OS Concepts', teacher: 'Mr. Linus T.', room: 'B-201' },
    { id: 8, batchId: 'cs-btech-2023', day: 'Thursday', time: '09:00 - 10:00', subject: 'Algorithms', teacher: 'Dr. Ada Lovelace', room: 'A-102' },
    // Lectures for Batch 4 (cs-btech-2024)
    { id: 9, batchId: 'cs-btech-2024', day: 'Wednesday', time: '10:00 - 11:00', subject: 'Intro to AI', teacher: 'Dr. G. Hinton', room: 'C-303' },
    // Lectures for Batch 2 (ee-btech-2023)
    { id: 4, batchId: 'ee-btech-2023', day: 'Monday', time: '09:00 - 10:00', subject: 'Circuit Theory', teacher: 'Dr. Gustav K.', room: 'E-101' },
    { id: 5, batchId: 'ee-btech-2023', day: 'Wednesday', time: '13:00 - 14:00', subject: 'Signal Processing', teacher: 'Dr. Nyquist', room: 'E-102' },
    // Lectures for Batch 3 (mech-btech-2022)
    { id: 6, batchId: 'mech-btech-2022', day: 'Tuesday', time: '10:00 - 11:00', subject: 'Thermodynamics', teacher: 'Mr. Carnot', room: 'M-101' },
    { id: 7, batchId: 'mech-btech-2022', day: 'Friday', time: '15:00 - 16:00', subject: 'Fluid Mechanics', teacher: 'Dr. Bernoulli', room: 'M-102' },
  ]
};

// --- NEW: Color Generation Logic ---

// 1. Define a palette of Tailwind CSS color names.
const tailwindColors = [
  'red', 'sky', 'amber', 'green', 'teal', 'indigo', 'pink', 'purple', 'lime', 'cyan', 'rose'
];

// 2. Create a helper function to generate the required CSS classes from a color name.
// This ensures the visual style (background opacity, border, text color) is preserved.
const getColorClasses = (color) => {
  return `bg-${color}-500/20 border-${color}-500 text-${color}-200`;
};

export default function ShowTimetable() {
  const schedNovaColor = "#FFD166";
  const bgGradient = "bg-gradient-to-b from-[#3B0D91] via-[#6A00F4] to-[#1D9AF0]";
  
  // State for managing UI and data
  const [profileOpen, setProfileOpen] = useState(false);
  const [timetableData, setTimetableData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effect hook to fetch data when the component mounts
  useEffect(() => {
    const fetchTimetableData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        
        const data = { ...mockApiData };

        // --- MODIFIED: Dynamically assign colors to lectures ---
        if (data.lectures) {
            const subjectColorMap = new Map();
            let colorIndex = 0;

            // Map over lectures to assign a consistent color to each unique subject
            const lecturesWithColors = data.lectures.map(lecture => {
                if (!subjectColorMap.has(lecture.subject)) {
                    const colorName = tailwindColors[colorIndex % tailwindColors.length];
                    subjectColorMap.set(lecture.subject, getColorClasses(colorName));
                    colorIndex++;
                }
                return {
                    ...lecture,
                    color: subjectColorMap.get(lecture.subject)
                };
            });
            
            // Update the data object with the modified lectures array
            data.lectures = lecturesWithColors;
        }
        
        setTimetableData(data);
        
        if (data.departments && data.departments.length > 0) {
          setSelectedDepartment(data.departments[0].id);
        }
      } catch (err) {
        setError('Failed to load timetable data. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetableData();
  }, []); 

  // Memoized value to get batches for the selected department
  const filteredBatches = React.useMemo(() => {
    if (!timetableData?.batches || !selectedDepartment) return [];
    return timetableData.batches.filter(batch => batch.departmentId === selectedDepartment);
  }, [selectedDepartment, timetableData]);

  // Effect to update selected batch when department changes
  useEffect(() => {
    if (filteredBatches.length > 0) {
      setSelectedBatch(filteredBatches[0].id);
    } else {
      setSelectedBatch('');
    }
  }, [filteredBatches]);

  const handlePrint = () => {
    window.print();
  }
  
  const filteredLectures = React.useMemo(() => {
    if (!timetableData?.lectures || !selectedBatch) return [];
    return timetableData.lectures.filter(lecture => lecture.batchId === selectedBatch);
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
      return <div className="text-center text-red-400 font-bold text-xl p-8">{error}</div>;
    }

    if (!timetableData || timetableData.departments.length === 0) {
      return <div className="text-center text-yellow-400 font-bold text-xl p-8">No timetable data available.</div>;
    }

    const { days, periods } = timetableData;

    return (
      <>
        {/* Timetable Grid for Medium screens and up */}
        <div className="hidden md:block overflow-x-auto">
          <div
            className="timetable-grid gap-1 text-center text-sm"
            style={{ '--day-count': days.length }}
          >
            <div className="p-3 font-semibold rounded-tl-lg bg-purple-800/80 sticky left-0 z-10">Time</div>
            {days.map(day => (
              <div key={day} className="p-3 font-semibold bg-purple-800/80">{day}</div>
            ))}
            {periods.map(time => (
              <React.Fragment key={time}>
                <div className="p-3 font-semibold bg-purple-800/80 sticky left-0 z-10">{time}</div>
                {days.map(day => {
                  const lecture = filteredLectures.find(l => l.day === day && l.time === time);
                  return (
                    <div key={`${day}-${time}`} className={`p-2 rounded-md min-h-[100px] flex items-center justify-center ${lecture ? `${lecture.color} border` : 'bg-purple-800/40'}`}>
                      {lecture && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col text-left w-full p-1">
                          <p className="font-bold text-white text-xs">{lecture.subject}</p>
                          <p className="text-white/80 text-xs">{lecture.teacher}</p>
                          <p className="text-yellow-300/90 text-xs font-semibold mt-1">Room: {lecture.room}</p>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Card view for Small screens */}
        <div className="block md:hidden space-y-4">
          {days.map(day => {
            const dayLectures = filteredLectures.filter(l => l.day === day).sort((a,b) => a.time.localeCompare(b.time));
            if(dayLectures.length === 0) return null;
            return (
              <div key={day} className="bg-purple-800/60 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-yellow-400 mb-3 border-b border-yellow-400/30 pb-2">{day}</h3>
                <div className="space-y-3">
                  {dayLectures.map(lecture => (
                    <motion.div key={lecture.id} className={`p-3 rounded-lg border-l-4 ${lecture.color.split(' ')[1]}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                      <p className="font-bold text-white">{lecture.subject}</p>
                      <p className="text-sm text-white/90">{lecture.time}</p>
                      <p className="text-sm text-white/80">{lecture.teacher}</p>
                      <p className="text-sm text-yellow-300/90 font-semibold mt-1">Room: {lecture.room}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </>
    );
  };
  
  return (
    <AppLayout hideSidebar>
      <div className={`printable-area`}>
        {/* Timetable Content */}
        <main className="flex-1 p-4 md:p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto">
            <div className="p-6 bg-purple-900/50 backdrop-blur-md rounded-xl shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print">
                <h2 className="text-2xl font-bold text-white mb-4 md:mb-0">Class Timetable</h2>
                <div className="flex flex-wrap items-center gap-4">
                  <a href="/add-periods" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-purple-900 font-bold hover:bg-yellow-500 transition">
                    <ArrowLeft className="w-5 h-5" />
                    <span>Go Back</span>
                  </a>
                  {/* Department Dropdown */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="dept-select" className="font-semibold text-white/90">Department:</label>
                    <select 
                      id="dept-select"
                      className="px-4 py-2 rounded-md bg-purple-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      disabled={isLoading || !timetableData}
                    >
                      {timetableData?.departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Dropdown */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="batch-select" className="font-semibold text-white/90">Batch:</label>
                    <select 
                      id="batch-select"
                      className="px-4 py-2 rounded-md bg-purple-800/80 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      disabled={isLoading || !selectedDepartment || filteredBatches.length === 0}
                    >
                      {filteredBatches.map(batch => (
                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-purple-900 font-bold hover:bg-yellow-500 transition disabled:opacity-50" disabled={isLoading || error}>
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

