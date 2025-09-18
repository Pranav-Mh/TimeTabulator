import React, { useState, useEffect } from "react";
import axios from "axios";

const Lab = () => {
  const [years, setYears] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [labSubjects, setLabSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState({});  // { batch-subjectId: teacherId }
  const [workloads, setWorkloads] = useState({});      // teacherId -> workload in hours

  // Load years, divisions, and teachers on mount
  useEffect(() => {
    axios.get("/api/years").then(res => setYears(res.data));
    axios.get("/api/divisions").then(res => setDivisions(res.data));
    axios.get("/api/teachers").then(res => setTeachers(res.data));
  }, []);

  // Load lab subjects when division is selected
  useEffect(() => {
    if (selectedDivision) {
      axios.get(`/api/lab-subjects?division=${selectedDivision}`)
        .then(res => setLabSubjects(res.data));
      // Clear previous assignments if division changes
      setAssignments({});
    }
  }, [selectedDivision]);

  // Helper to handle teacher assignment change with workload check
  const handleAssignTeacher = (batchSubjectKey, teacherId) => {
    // Real-time workload validation
    axios.get(`/api/teacher-workload/${teacherId}`)
      .then(res => {
        const workloadHours = res.data.hours || 0;
        // Assuming max 10 hours workload per week
        if (workloadHours + 2 > 10) {
          alert("Teacher workload exceeds limit!");
          return;
        }

        // Update assignment and workload state
        setAssignments(prev => ({ ...prev, [batchSubjectKey]: teacherId }));
        setWorkloads(prev => ({ ...prev, [teacherId]: workloadHours + 2 }));
      });
  };

  // Save assignments to backend batch-wise
  const handleSave = () => {
    const payload = Object.entries(assignments).map(([batchSubjectKey, teacherId]) => {
      const [batch, subjectId] = batchSubjectKey.split("-");
      return {
        batch,
        subjectId,
        teacherId,
        hours: 2,
        division: selectedDivision,
        year: selectedYear,
      };
    });

    axios.post("/api/lab-assignments", payload)
      .then(() => alert("Assignments saved successfully."))
      .catch(() => alert("Error saving assignments."));
  };

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-semibold">Assign Teachers to Labs</h2>

      <div className="flex gap-4 mb-4">
        <select
          className="border p-2"
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
        >
          <option value="">Select Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          className="border p-2"
          value={selectedDivision}
          onChange={e => setSelectedDivision(e.target.value)}
        >
          <option value="">Select Division</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {labSubjects.length > 0 && (
        <table className="table-auto border-collapse border w-full mb-4">
          <thead>
            <tr className="border">
              <th className="border px-2 py-1">Lab Subject</th>
              <th className="border px-2 py-1">Batch SE-A1</th>
              <th className="border px-2 py-1">Batch SE-A2</th>
              <th className="border px-2 py-1">Batch SE-A3</th>
            </tr>
          </thead>
          <tbody>
            {labSubjects.map(subject => (
              <tr key={subject.id}>
                <td className="border px-2 py-1">{subject.name}</td>

                {["SE-A1", "SE-A2", "SE-A3"].map(batch => (
                  <td key={batch} className="border px-2 py-1">
                    <select
                      className="border p-1"
                      value={assignments[batch + "-" + subject.id] || ""}
                      onChange={e =>
                        handleAssignTeacher(batch + "-" + subject.id, e.target.value)
                      }
                    >
                      <option value="">Assign Teacher</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleSave}
        disabled={Object.keys(assignments).length === 0}
      >
        Save Assignments
      </button>
    </div>
  );
};

export default Lab;
