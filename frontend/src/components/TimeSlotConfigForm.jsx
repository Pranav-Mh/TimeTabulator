import React, { useState, useEffect } from "react";
import axios from "axios";

const TimeSlotConfigForm = () => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ start: "", end: "", type: "period" });

  useEffect(() => {
    axios.get("/api/config/time-slots")
      .then(res => setTimeSlots(res.data))
      .catch(() => alert("Failed to load timeslots"));
  }, []);

  const handleAddSlot = () => {
    if (!newSlot.start || !newSlot.end) {
      alert("Start and End time required");
      return;
    }
    if (newSlot.start >= newSlot.end) {
      alert("Start time must be before End time");
      return;
    }
    axios.post("/api/config/time-slots", newSlot)
      .then(() => {
        setTimeSlots([...timeSlots, newSlot]);
        setNewSlot({ start: "", end: "", type: "period" });
      })
      .catch(() => alert("Failed to add time slot"));
  };

  const handleDeleteSlot = (index) => {
    const slot = timeSlots[index];
    axios.delete(`/api/config/time-slots/${index}`)
      .then(() => {
        const updatedSlots = [...timeSlots];
        updatedSlots.splice(index, 1);
        setTimeSlots(updatedSlots);
      })
      .catch(() => alert("Delete failed"));
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Time Slots Configuration</h3>

      <div className="mb-4">
        <label className="mr-2">Start Time:</label>
        <input
          type="time"
          value={newSlot.start}
          onChange={e => setNewSlot({ ...newSlot, start: e.target.value })}
          className="border p-1 mr-4"
        />

        <label className="mr-2">End Time:</label>
        <input
          type="time"
          value={newSlot.end}
          onChange={e => setNewSlot({ ...newSlot, end: e.target.value })}
          className="border p-1"
        />
      </div>

      <div className="mb-4">
        <label className="mr-2">Type:</label>
        <select
          value={newSlot.type}
          onChange={e => setNewSlot({ ...newSlot, type: e.target.value })}
          className="border p-1"
        >
          <option value="period">Period</option>
          <option value="recess">Recess</option>
          <option value="lunch">Lunch</option>
        </select>
      </div>

      <button
        onClick={handleAddSlot}
        className="bg-green-600 text-white px-3 py-1 rounded mb-4"
      >
        Add Time Slot
      </button>

      {timeSlots.length > 0 && (
        <table className="table-auto border-collapse border w-full">
          <thead>
            <tr>
              <th className="border px-2 py-1">Start</th>
              <th className="border px-2 py-1">End</th>
              <th className="border px-2 py-1">Type</th>
              <th className="border px-2 py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((ts, i) => (
              <tr key={i}>
                <td className="border px-2 py-1">{ts.start}</td>
                <td className="border px-2 py-1">{ts.end}</td>
                <td className="border px-2 py-1 capitalize">{ts.type}</td>
                <td className="border px-2 py-1">
                  <button
                    className="text-red-600"
                    onClick={() => handleDeleteSlot(i)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TimeSlotConfigForm;
