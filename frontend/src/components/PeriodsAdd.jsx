import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "./layout/AppLayout";

// Simulated data to mimic fetching from your FastAPI backend
const initialData = {
  periodsCount: "",
  timeSlots: [],
  selectedDays: [],
};

export default function AddPeriods() {
  const navigate = useNavigate();

  // App-specific state
  const [periodsCount, setPeriodsCount] = useState(initialData.periodsCount);
  const [timeSlots, setTimeSlots] = useState(initialData.timeSlots);
  const [selectedDays, setSelectedDays] = useState(initialData.selectedDays);
  const [timeValidationErrors, setTimeValidationErrors] = useState(
    Array(initialData.periodsCount).fill("")
  );

  const allDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const workingDays = allDays.filter((day) => selectedDays.includes(day));
  const daysOff = allDays.filter((day) => !selectedDays.includes(day));

  // Helper function to convert time to total minutes
  const convertToMinutes = (hour, minute) => {
    return parseInt(hour) * 60 + parseInt(minute);
  };

  // Handle periods count change
  const handlePeriodsChange = (e) => {
    const newCount = parseInt(e.target.value, 10) || 0;
    setPeriodsCount(newCount);

    const newSlots = Array.from({ length: newCount }, () => ({
      fromHour: "",
      fromMinute: "",
      toHour: "",
      toMinute: "",
    }));

    setTimeSlots(newSlots);
    setTimeValidationErrors(Array(newCount).fill(""));
  };

  // Handle time slot change
  const handleTimeSlotChange = (index, field, value) => {
    const newTimeSlots = [...timeSlots];
    newTimeSlots[index][field] = value;

    const newErrors = [...timeValidationErrors];
    newErrors[index] = "";

    const slot = newTimeSlots[index];

    if (slot.fromHour && slot.fromMinute && slot.toHour && slot.toMinute) {
      const fromMinutes = convertToMinutes(slot.fromHour, slot.fromMinute);
      const toMinutes = convertToMinutes(slot.toHour, slot.toMinute);

      if (toMinutes <= fromMinutes) {
        newErrors[index] = "End time must be after start time.";
      }
    }

    setTimeSlots(newTimeSlots);
    setTimeValidationErrors(newErrors);
  };

  const handleDayToggle = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const savePeriodsToDB = async () => {
    const token = localStorage.getItem("token");

    // Build slots payload correctly
    const slots = [];

    selectedDays.forEach((day) => {
      timeSlots.forEach((slot, index) => {
        if (
          slot.fromHour &&
          slot.fromMinute &&
          slot.toHour &&
          slot.toMinute &&
          !timeValidationErrors[index]
        ) {
          slots.push({
            day_of_week: day,
            slot_number: index + 1,
            start_time: `${slot.fromHour}:${slot.fromMinute}`,
            end_time: `${slot.toHour}:${slot.toMinute}`,
          });
        }
      });
    });

    if (slots.length === 0) {
      alert("Please define at least one valid period");
      return false;
    }
    console.log("SLOTS BEING SENT:", slots);
    const res = await fetch("http://127.0.0.1:8000/timeslots/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slots }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Save failed:", data);
      alert("Failed to save periods");
      return false;
    }

    console.log("Saved:", data);
    return true;
  };

  const handleNext = async () => {
    const success = await savePeriodsToDB();
    if (success) {
      navigate("/rooms");
    }
  };

  return (
    <AppLayout>

      <div className="max-w-4xl mx-auto space-y-8 p-6 bg-purple-900/50 backdrop-blur-md rounded-xl shadow-lg">

        <h3 className="text-xl font-semibold mb-4 text-center">
          Schedule Configuration
        </h3>

        {/* Period Count */}
        <div className="bg-purple-900/70 p-4 rounded-lg">
          <label className="block mb-2">Number of Periods</label>
          <input
            type="number"
            value={periodsCount}
            onChange={handlePeriodsChange}
            className="w-full px-4 py-2 rounded bg-purple-800 text-white"
          />
        </div>

        {/* Time Slots */}
        <AnimatePresence>
          {periodsCount > 0 && (
            <div className="space-y-4">
              {timeSlots.map((slot, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-purple-900/70 p-4 rounded-lg"
                >
                  <p className="mb-2">Period {index + 1}</p>

                  <div className="flex gap-3">
                    <input
                      placeholder="From HH"
                      value={slot.fromHour}
                      onChange={(e) =>
                        handleTimeSlotChange(index, "fromHour", e.target.value)
                      }
                      className="w-24 px-2 py-1 rounded bg-purple-800 text-white"
                    />

                    <input
                      placeholder="From MM"
                      value={slot.fromMinute}
                      onChange={(e) =>
                        handleTimeSlotChange(index, "fromMinute", e.target.value)
                      }
                      className="w-24 px-2 py-1 rounded bg-purple-800 text-white"
                    />

                    <input
                      placeholder="To HH"
                      value={slot.toHour}
                      onChange={(e) =>
                        handleTimeSlotChange(index, "toHour", e.target.value)
                      }
                      className="w-24 px-2 py-1 rounded bg-purple-800 text-white"
                    />

                    <input
                      placeholder="To MM"
                      value={slot.toMinute}
                      onChange={(e) =>
                        handleTimeSlotChange(index, "toMinute", e.target.value)
                      }
                      className="w-24 px-2 py-1 rounded bg-purple-800 text-white"
                    />
                  </div>

                  {timeValidationErrors[index] && (
                    <p className="text-red-400 mt-2">
                      {timeValidationErrors[index]}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Working Days */}
        <div>
          <h4 className="mb-2">Select Working Days</h4>

          <div className="grid grid-cols-3 gap-2">
            {allDays.map((day) => (
              <button
                key={day}
                onClick={() => handleDayToggle(day)}
                className={`p-2 rounded ${
                  selectedDays.includes(day)
                    ? "bg-yellow-400 text-black"
                    : "bg-purple-800 text-white"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <p>Working Days: {workingDays.join(", ") || "None"}</p>
            <p>Days Off: {daysOff.join(", ") || "None"}</p>
          </div>
        </div>

      </div>

      <div className="flex justify-end max-w-4xl mx-auto mt-8">
        <button
          onClick={handleNext}
          className="px-6 py-3 rounded-lg bg-[#4A0D8D] text-white font-bold"
        >
          Next
        </button>
      </div>

    </AppLayout>
  );
}
