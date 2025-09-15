import React, { useState } from "react";

export default function Syllabus() {
  const [year, setYear] = useState("SE");
  const [divisions, setDivisions] = useState(1);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Syllabus / Divisions</h2>
      <div className="bg-white p-4 rounded shadow">
        <label className="block mb-2">Academic Year</label>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border p-2 rounded mb-4"
        >
          <option value="SE">SE</option>
          <option value="TE">TE</option>
          <option value="BE">BE</option>
        </select>

        <label className="block mb-2">Number of divisions</label>
        <input
          type="number"
          value={divisions}
          min={1}
          onChange={(e) => setDivisions(Number(e.target.value))}
          className="border p-2 rounded w-32"
        />

        <div className="mt-6">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Save Syllabus
          </button>
        </div>
      </div>
    </div>
  );
}
