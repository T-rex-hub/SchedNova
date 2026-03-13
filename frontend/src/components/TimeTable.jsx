import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play
} from "lucide-react";

import AppLayout from "./layout/AppLayout";

import { useNavigate } from "react-router-dom";


// Debounce utility function to limit write operations to a backend
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

export default function TimeTable() {
  const [loading, setLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false); // New state for the button
  const [isContentVisible, setIsContentVisible] = useState(false);

  const navigate = useNavigate();


  useEffect(() => {
    setTimeout(() => {
      setIsContentVisible(true);
    }, 100);
  }, []);

  const handleGenerateTimetable = async () => {
    setLoading(true);
    setGenerationStatus("Generating timetable...");
    setIsGenerationComplete(false); // Reset on each new generation attempt
    
    // Simulate API call to backend
    try {
      const response = await new Promise(resolve => setTimeout(() => {
        resolve({ status: 200, data: "Timetable generated successfully!" });
      }, 3000));

      if (response.status === 200) {
        setGenerationStatus("Success! Your timetable is ready.");
        setIsGenerationComplete(true); // Set to true on success to show the button
      } else {
        setGenerationStatus("Failed to generate timetable. Please try again.");
      }
    } catch (error) {
      setGenerationStatus("An error occurred. Please check your data and network connection.");
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
              Click the button below to generate a new timetable based on all the data you've entered.
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
              {loading ? "Generating..." : "Generate Timetable"}
            </motion.button>

            {generationStatus && (
              <div className="mt-4 p-4 rounded-lg bg-white/10 text-white">
                {generationStatus}
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

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 px-8">
        <a
          href="/group"
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold bg-[#4A0D8D] hover:bg-[#6A00F4]"
        >
          ← Previous
        </a>

        <span></span>
      </div>

    </AppLayout>
  );
}
