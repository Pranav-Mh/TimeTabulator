import React, { useEffect, useMemo, useState } from 'react';
import '../index.css';

const MOCK_TEACHERS = [
  { _id: 't1', name: 'Raj', maxWorkload: 20 },
  { _id: 't2', name: 'Yash', maxWorkload: 21 },
  { _id: 't3', name: 'Rina', maxWorkload: 15 },
];

const MOCK_SUBJECTS = [
  { _id: 's1', name: 'DS', type: 'TH', hours: 2, year: 'SE', division: 'A' },
  { _id: 's2', name: 'OOP', type: 'TH', hours: 3, year: 'SE', division: 'A' },
  { _id: 's3', name: 'POM', type: 'TH', hours: 2, year: 'SE', division: 'A' },
  { _id: 's4', name: 'AP', type: 'VAP', hours: 1, year: 'SE', division: 'A' },
  { _id: 's5', name: 'ML', type: 'TH', hours: 3, year: 'TE', division: 'A' },
];

const STORAGE_PREFIX = 'assignTheory_v2';
const getStorageKey = (year, division) => `${STORAGE_PREFIX}:${year}:${division}`;

const loadAssignments = (year, division) => {
  try {
    const raw = localStorage.getItem(getStorageKey(year, division));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveAssignments = (year, division, assignments) => {
  localStorage.setItem(getStorageKey(year, division), JSON.stringify(assignments));
};

export default function AssignTheory() {
  const [year, setYear] = useState('SE');
  const [division, setDivision] = useState('A');
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    setTeachers(MOCK_TEACHERS);
    setSubjects(
      MOCK_SUBJECTS.filter(
        s => s.year === year && s.division === division && ['TH', 'OE', 'VAP'].includes(s.type)
      )
    );
    setAssignments(loadAssignments(year, division));
    setError('');
  }, [year, division]);

  const teacherLoads = useMemo(() => {
    const loads = {};
    Object.entries(assignments).forEach(([subId, tId]) => {
      const sub = subjects.find(s => s._id === subId);
      if (tId && sub) {
        loads[tId] = (loads[tId] || 0) + sub.hours;
      }
    });
    return loads;
  }, [assignments, subjects]);

  const handleAssign = (subjectId, teacherId) => {
    setError('');
    if (!teacherId) {
      setAssignments(prev => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
      return;
    }

    const teacher = teachers.find(t => t._id === teacherId);
    const subject = subjects.find(s => s._id === subjectId);
    const currentLoad = teacherLoads[teacherId] || 0;
    const alreadyAssigned = assignments[subjectId] === teacherId;

    const projectedLoad = alreadyAssigned ? currentLoad : currentLoad + subject.hours;

    if (projectedLoad > teacher.maxWorkload) {
      setError(`Error: Teacher's workload limit exceeded for ${teacher.name}`);
      return;
    }

    setAssignments(prev => ({ ...prev, [subjectId]: teacherId }));
  };

  const handleSave = () => {
    const unassigned = subjects.filter(s => !assignments[s._id]);
    if (unassigned.length > 0) {
      setError('Please assign all subjects before saving.');
      return;
    }
    saveAssignments(year, division, assignments);
    setError('');
    alert('Assignments saved successfully!');
  };

  const handleClear = () => {
    setAssignments({});
    localStorage.removeItem(getStorageKey(year, division));
    setError('');
  };

  return (
    <div className="assign-theory-page">
      <h1>Assign Teachers to Theory Subjects</h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <label>
          Year:
          <select value={year} onChange={e => setYear(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="SE">SE</option>
            <option value="TE">TE</option>
            <option value="BE">BE</option>
          </select>
        </label>
        <label>
          Division:
          <select value={division} onChange={e => setDivision(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Type</th>
            <th>Hours/Week</th>
            <th>Assign Teacher</th>
          </tr>
        </thead>
        <tbody>
          {subjects.length === 0 && (
            <tr>
              <td colSpan={4}>No theory subjects for {year} {division}.</td>
            </tr>
          )}
          {subjects.map(sub => (
            <tr key={sub._id}>
              <td>{sub.name}</td>
              <td>{sub.type}</td>
              <td>{sub.hours}</td>
              <td>
                <select
                  value={assignments[sub._id] || ''}
                  onChange={e => handleAssign(sub._id, e.target.value)}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => {
                    const cur = teacherLoads[t._id] || 0;
                    return (
                      <option key={t._id} value={t._id}>
                        {t.name} ({cur}/{t.maxWorkload})
                      </option>
                    );
                  })}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && (
        <div style={{ color: 'red', marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="save-btn" onClick={handleSave}>Save</button>
        <button className="clear-btn" onClick={handleClear} style={{ marginLeft: 8 }}>Clear</button>
      </div>

      <h3 style={{ marginTop: 24 }}>Teacher Workload Summary</h3>
      <ul>
        {teachers.map(t => (
          <li key={t._id}>
            {t.name}: {teacherLoads[t._id] || 0}/{t.maxWorkload} hours
          </li>
        ))}
      </ul>
    </div>
  );
}
