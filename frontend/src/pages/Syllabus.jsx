import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Syllabus.css';

const Syllabus = () => {
  const [year, setYear] = useState('SE');
  const [divisions, setDivisions] = useState(1);
  const [divisionNames, setDivisionNames] = useState(['SE-A']);
  const [subjects, setSubjects] = useState([
    { name: '', type: 'TH', credits: '', hours: '' }
  ]);

  // Update division names dynamically
  useEffect(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const names = [];
    for (let i = 0; i < divisions; i++) {
      names.push(`${year}-${letters[i]}`);
    }
    setDivisionNames(names);
  }, [divisions, year]);

  // Add a new subject row
  const handleAddSubject = () => {
    setSubjects([...subjects, { name: '', type: 'TH', credits: '', hours: '' }]);
  };

  // Remove a subject row
  const handleRemoveSubject = (index) => {
    const newSubjects = subjects.filter((_, i) => i !== index);
    setSubjects(newSubjects);
  };

  // Update subject fields
  const handleChange = (index, field, value) => {
    const newSubjects = [...subjects];
    newSubjects[index][field] = value;
    setSubjects(newSubjects);
  };

  // Save syllabus to backend
  const handleSave = () => {
    // Sanitize subjects and convert numeric fields
    const sanitizedSubjects = subjects
      .filter(s => s.name.trim() !== '') // Filter out empty names
      .map(s => ({
        name: s.name.trim(),
        type: s.type,
        credits: Number(s.credits) || 0,
        hours: Number(s.hours) || 0
      }));

    if (sanitizedSubjects.length === 0) {
      alert('Please add at least one subject with a valid name.');
      return;
    }

    const payload = {
      year,
      divisionCount: Number(divisions),
      divisions: Array.from({ length: divisions }, (_, i) => `${year}-${String.fromCharCode(65 + i)}`),
      subjects: sanitizedSubjects
    };

    console.log("Sending payload:", payload);

    axios.post('http://localhost:5000/api/syllabus', payload)
      .then(() => alert('Syllabus saved successfully!'))
      .catch(err => {
        if (err.response && err.response.data && err.response.data.message) {
          alert('Error saving syllabus: ' + err.response.data.message);
        } else {
          alert('Error saving syllabus!');
        }
      });
  };

  return (
    <div className="syllabus-page">
      <h1>Syllabus Configuration</h1>

      {/* Academic Year Selection */}
      <div className="year-selection">
        <label>Academic Year: </label>
        <select value={year} onChange={e => setYear(e.target.value)}>
          <option value="SE">SE</option>
          <option value="TE">TE</option>
          <option value="BE">BE</option>
        </select>
      </div>

      {/* Number of Divisions */}
      <div className="divisions-control">
        <label>Number of Divisions: </label>
        <input
          type="number"
          min="1"
          value={divisions}
          onChange={e => setDivisions(parseInt(e.target.value) || 1)}
        />
      </div>

      {/* Division Preview */}
      <div className="division-preview">
        <strong>Divisions:</strong> {divisionNames.join(', ')}
      </div>

      {/* Subjects Table */}
      <div className="subjects-section">
        <button className="add-btn" onClick={handleAddSubject}>Add Subject</button>
        <table>
          <thead>
            <tr>
              <th>Subject Name</th>
              <th>Type</th>
              <th>Credits</th>
              <th>Hours/Week</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subj, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={subj.name}
                    onChange={e => handleChange(idx, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={subj.type}
                    onChange={e => handleChange(idx, 'type', e.target.value)}
                  >
                    <option value="TH">TH</option>
                    <option value="PR">PR</option>
                    <option value="VAP">VAP</option>
                    <option value="OE">OE</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={subj.credits}
                    onChange={e => handleChange(idx, 'credits', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={subj.hours}
                    onChange={e => handleChange(idx, 'hours', e.target.value)}
                  />
                </td>
                <td>
                  <button className="remove-btn" onClick={() => handleRemoveSubject(idx)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      <button className="save-btn" onClick={handleSave}>Save</button>
    </div>
  );
};

export default Syllabus;
