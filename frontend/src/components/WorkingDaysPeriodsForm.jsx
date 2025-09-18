import React, { useState, useEffect } from "react";
import axios from "axios";

const WorkingDaysPeriodsForm = () => {
  const [workingDays, setWorkingDays] = useState(5);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);

  useEffect(() => {
    // fetch existing configuration
    axios.get("/api/config/working-days-periods")
      .then(res => {
        if (res.data) {
          setWorkingDays(res.data.workingDays);
          setPeriodsPerDay(res.data.periodsPerDay);
        }
      });
  }, []);

  const handleSave = () => {
    axios.post("/api/config/working-days-periods", {
      workingDays,
      periodsPerDay,
    })
    .then(() => alert("Working days and periods saved"))
    .catch(() => alert("Save failed"));
  };

  return (
    <div className="mb-6 p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Working Days & Periods</h3>
      <label>Working Days per Week:</label>
      <input
        type="number"
        min="1"
        max="7"
        value={workingDays}
        onChange={e => setWorkingDays(Number(e.target.value))}
        className="border p-1 w-20 mb-4"
      />

      <label>Periods per Day:</label>
      <input
        type="number"
        min="1"
        max="15"
        value={periodsPerDay}
        onChange={e => setPeriodsPerDay(Number(e.target.value))}
        className="border p-1 w-20 mb-4"
      />

      <button
        onClick={handleSave}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Save Configuration
      </button>
    </div>
  );
};

export default WorkingDaysPeriodsForm;
