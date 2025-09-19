import React, { useState } from 'react';
import axios from 'axios';

const yearOptions = ["SE", "TE", "BE"];

const defaultSubject = { name: "", type: "TH", credits: 1, hours: 1 };

export default function SyllabusConfigPage({ onComplete }) {
  const [selectedYear, setSelectedYear] = useState("SE");
  const [divisionCount, setDivisionCount] = useState(1);
  const [subjects, setSubjects] = useState([ { ...defaultSubject } ]);

  // Tracks completion for all years before allowing to proceed
  const [yearComplete, setYearComplete] = useState({ SE: false, TE: false, BE: false });

  const divisions = Array.from({length: divisionCount}, (_, i) => `${selectedYear}-${String.fromCharCode(65+i)}`);

  function handleAddSubject() {
    setSubjects([...subjects, { ...defaultSubject }]);
  }

  function handleChangeSubject(idx, field, value) {
    setSubjects(subjects.map((sub, i) =>
      i === idx ? { ...sub, [field]: value } : sub
    ));
  }

  function handleRemoveSubject(idx) {
    setSubjects(subjects.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    // Validation: must have at least one subject and compulsory fields set
    if (subjects.length === 0 || !divisionCount) {
      alert("Fill all details!");
      return;
    }

    // Send to backend as one object
    try {
      await axios.post('/api/syllabus', {
        year: selectedYear,
        divisionCount,
        divisions,
        subjects
      });
      setYearComplete(yc => ({ ...yc, [selectedYear]: true }));

      // Auto switch to next year if not done
      const nextIndex = yearOptions.indexOf(selectedYear) + 1;
      if (nextIndex < yearOptions.length) {
        setSelectedYear(yearOptions[nextIndex]);
        setDivisionCount(1);
        setSubjects([{ ...defaultSubject }]);
      } else {
        alert("All years configured! You may now move to Teacher tab.");
        if (onComplete) onComplete();
      }
    } catch (err) {
      alert("Error saving syllabus!");
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-center mb-6">Syllabus Configuration</h2>

      {/* Tabs for years */}
      <div className="flex justify-center mb-4 gap-4">
        {yearOptions.map(year => (
          <button
            key={year}
            className={`px-6 py-2 rounded ${selectedYear === year
                ? "bg-purple-700 text-white"
                : "bg-gray-200 text-gray-700"}`}
            disabled={yearComplete[year]}
            onClick={() => setSelectedYear(year)}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Division selection */}
      <div className="mb-4 flex gap-8 justify-center items-center">
        <div>
          <label>Number of Divisions: </label>
          <input
            type="number"
            min={1}
            max={6}
            value={divisionCount}
            onChange={e => setDivisionCount(Math.max(1, Math.min(6, Number(e.target.value))))}
            className="border px-2 py-1 w-14 ml-2"
          />
        </div>
        <div>
          <span>Divisions: {divisions.join(", ")}</span>
        </div>
      </div>

      {/* Subjects Table */}
      <table className="table-auto w-full border mb-4">
        <thead>
          <tr>
            <th className="border px-2 py-1">Subject Name</th>
            <th className="border px-2 py-1">Type</th>
            <th className="border px-2 py-1">Credits</th>
            <th className="border px-2 py-1">Hours/Week</th>
            <th className="border px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((sub, idx) => (
            <tr key={idx}>
              <td className="border px-2 py-1">
                <input
                  value={sub.name}
                  onChange={e => handleChangeSubject(idx, "name", e.target.value)}
                  className="border px-2 py-1 w-full"
                />
              </td>
              <td className="border px-2 py-1">
                <select
                  value={sub.type}
                  onChange={e => handleChangeSubject(idx, "type", e.target.value)}
                  className="border px-2 py-1"
                >
                  <option value="TH">TH</option>
                  <option value="PR">PR</option>
                  <option value="VAP">VAP</option>
                  <option value="OE">OE</option>
                </select>
              </td>
              <td className="border px-2 py-1">
                <input
                  type="number"
                  value={sub.credits}
                  onChange={e => handleChangeSubject(idx, "credits", Number(e.target.value))}
                  className="border px-2 py-1 w-16"
                />
              </td>
              <td className="border px-2 py-1">
                <input
                  type="number"
                  value={sub.hours}
                  onChange={e => handleChangeSubject(idx, "hours", Number(e.target.value))}
                  className="border px-2 py-1 w-16"
                />
              </td>
              <td className="border px-2 py-1">
                <button
                  onClick={() => handleRemoveSubject(idx)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-5 justify-start mb-4">
        <button
          onClick={handleAddSubject}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Subject
        </button>
      </div>
      <button
        onClick={handleSave}
        className="bg-green-600 text-white px-6 py-2 rounded"
        disabled={subjects.length === 0 || !divisionCount}
      >
        Save
      </button>
    </div>
  );
}
