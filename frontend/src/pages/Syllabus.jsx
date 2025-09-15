import React, { useState } from "react";
import axios from "axios";

const SyllabusConfig = () => {
  const [year, setYear] = useState("SE");
  const [divisions, setDivisions] = useState(1);
  const [subjects, setSubjects] = useState([
    { name: "", type: "", credits: "", hours: "" },
  ]);

  // Generate division names dynamically
  const getDivisionNames = () => {
    return Array.from({ length: divisions }, (_, i) => `${year}-${String.fromCharCode(65 + i)}`);
  };

  const handleAddSubject = () => {
    setSubjects([...subjects, { name: "", type: "", credits: "", hours: "" }]);
  };

  const handleRemoveSubject = (index) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index, field, value) => {
    setSubjects(subjects.map((sub, i) =>
      i === index ? { ...sub, [field]: value } : sub
    ));
  };

  const handleSave = () => {
    if (subjects.some(s => !s.name || !s.type || !s.credits || !s.hours)) {
      alert("⚠️ Please fill in all subject fields.");
      return;
    }

    axios.post("http://localhost:5000/api/syllabus", {
      year,
      divisions,
      subjects,
    })
      .then(() => alert("✅ Syllabus Saved Successfully"))
      .catch(() => alert("❌ Error saving syllabus"));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold text-center mb-6">Syllabus Assignment</h1>

      {/* Year Tabs */}
      <div className="flex justify-center space-x-4 mb-6">
        {["SE", "TE", "BE"].map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-6 py-2 rounded-lg border transition ${
              year === y ? "bg-purple-500 text-white" : "bg-gray-100"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Divisions */}
      <div className="flex items-center justify-between border rounded-lg p-4 mb-6">
        <label className="flex items-center space-x-2">
          <span className="font-medium">Number of Divisions:</span>
          <input
            type="number"
            min="1"
            value={divisions}
            onChange={(e) => setDivisions(parseInt(e.target.value) || 1)}
            className="border rounded p-2 w-20"
          />
        </label>
        <div className="text-gray-600">
          {getDivisionNames().join(", ")}
        </div>
      </div>

      {/* Subjects Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Subject Name</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Credits</th>
              <th className="border p-2">No. of Hours/Week</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subj, idx) => (
              <tr key={idx}>
                <td className="border p-2">
                  <input
                    type="text"
                    value={subj.name}
                    onChange={(e) => handleSubjectChange(idx, "name", e.target.value)}
                    className="border rounded p-2 w-full"
                    placeholder="Enter subject"
                  />
                </td>
                <td className="border p-2">
                  <select
                    value={subj.type}
                    onChange={(e) => handleSubjectChange(idx, "type", e.target.value)}
                    className="border rounded p-2 w-full"
                  >
                    <option value="">Select</option>
                    <option value="TH">TH</option>
                    <option value="PR">PR</option>
                    <option value="VAP">VAP</option>
                    <option value="OE">OE</option>
                  </select>
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={subj.credits}
                    onChange={(e) => handleSubjectChange(idx, "credits", e.target.value)}
                    className="border rounded p-2 w-full"
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={subj.hours}
                    onChange={(e) => handleSubjectChange(idx, "hours", e.target.value)}
                    className="border rounded p-2 w-full"
                  />
                </td>
                <td className="border p-2 text-center">
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
      </div>

      {/* Add Subject + Save */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleAddSubject}
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          + Add subject
        </button>
        <button
          onClick={handleSave}
          className="bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default SyllabusConfig;
