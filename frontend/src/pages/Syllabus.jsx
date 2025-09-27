import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../index.css';

const Syllabus = () => {
  const [selectedYear, setSelectedYear] = useState('SE');
  const [numDivisions, setNumDivisions] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [syllabusStatus, setSyllabusStatus] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Fetch when component mounts
    loadSyllabus(selectedYear);
    fetchSyllabusStatus();
  }, []);

  useEffect(() => {
    // Fetch again when user changes year
    loadSyllabus(selectedYear);
    fetchSyllabusStatus();
  }, [selectedYear]);

  const fetchSyllabusStatus = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/syllabus/status');
      setSyllabusStatus(res.data);
    } catch (err) {
      console.error('Error fetching syllabus status:', err);
    }
  };

  const loadSyllabus = async (year) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/syllabus/${year}`);
      setNumDivisions(parseInt(res.data.numDivisions) || 1);  // Force number type
      const existingSubjects = res.data.subjects?.map(subject => ({
        courseCode: subject.courseCode || '',
        name: subject.name || '',
        type: subject.type || 'TH',
        credits: subject.credits || '',
        hoursPerWeek: subject.hoursPerWeek || ''
      })) || [];
      setSubjects(existingSubjects);
    } catch (err) {
      setNumDivisions(1);
      setSubjects([]);
    }
  };

  const generateDivisionNames = (year, count) => {
    const divisions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    return Array.from({ length: count }, (_, i) => `${year}-${divisions[i]}`).join(', ');
  };

  const addSubject = () => {
    setSubjects([...subjects, { courseCode: '', name: '', type: 'TH', credits: '', hoursPerWeek: '' }]);
  };

  const removeSubject = (index) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const updateSubject = (index, field, value) => {
    const updatedSubjects = [...subjects];
    if (field === 'name' && !updatedSubjects[index].courseCode && value) {
      const baseCode = getYearPrefix(selectedYear) + (index + 1).toString().padStart(2, '0');
      updatedSubjects[index].courseCode = baseCode;
    }
    updatedSubjects[index][field] = value;
    setSubjects(updatedSubjects);
    if (errorMessage) setErrorMessage('');
  };

  const getYearPrefix = (year) => {
    const prefixes = { 'SE': 'CSE3', 'TE': 'CSE4', 'BE': 'CSE5' };
    return prefixes[year] || 'CSE3';
  };

  const validateSubjects = () => {
    if (subjects.length === 0) return 'Please add at least one subject';
    for (const subject of subjects) {
      if (!subject.courseCode || !subject.name || !subject.credits || !subject.hoursPerWeek) {
        return 'Please fill all subject fields including Course Code';
      }
      if (subject.courseCode.length < 3) {
        return 'Course Code must be at least 3 characters long';
      }
    }
    const courseCodes = subjects.map(s => s.courseCode.toUpperCase());
    const duplicates = courseCodes.filter((code, i) => courseCodes.indexOf(code) !== i);
    if (duplicates.length > 0) return `Duplicate course codes found: ${[...new Set(duplicates)].join(', ')}`;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const validationError = validateSubjects();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/api/syllabus', {
        academicYear: selectedYear,
        numDivisions: parseInt(numDivisions),
        subjects: subjects.map(s => ({
          ...s,
          courseCode: s.courseCode.toUpperCase(),
          credits: parseInt(s.credits),
          hoursPerWeek: parseInt(s.hoursPerWeek)
        }))
      });
      setSuccessMessage(`✅ ${selectedYear} syllabus saved successfully! Created ${response.data.courseCodes?.length || 0} subjects.`);
      fetchSyllabusStatus();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'An error occurred while saving syllabus';
      setErrorMessage(errorMsg);
    }
  };

  const canAccessLecture = syllabusStatus.lectureAccessAllowed;
  const seStatus = syllabusStatus.seCompleted ? '✅' : '❌';
  const teStatus = syllabusStatus.teCompleted ? '✅' : '❌';
  const beStatus = syllabusStatus.beCompleted ? '✅' : '⚪';

  return (
    <div className="syllabus-page">
      <h1>Syllabus Configuration</h1>
      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <h3>Completion Status:</h3>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span>SE: {seStatus}</span>
          <span>TE: {teStatus}</span>
          <span>BE: {beStatus}</span>
          <span style={{ color: canAccessLecture ? 'green' : 'red', fontWeight: 'bold' }}>
            {canAccessLecture ? '🔓 Lecture Tab Unlocked' : '🔒 Complete SE + TE to unlock Lecture Tab'}
          </span>
        </div>
      </div>
      {errorMessage && (
        <div style={{ color: 'red', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '5px', marginBottom: '10px', border: '1px solid red' }}>
          ⚠️ {errorMessage}
        </div>
      )}
      {successMessage && (
        <div style={{ color: 'green', backgroundColor: '#e6ffe6', padding: '10px', borderRadius: '5px', marginBottom: '10px', border: '1px solid green' }}>
          {successMessage}
        </div>
      )}
      <div style={{ marginBottom: '20px' }}>
        <label>Academic Year: </label>
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ marginLeft: '10px', padding: '5px' }}>
          <option value="SE">SE (Second Year)</option>
          <option value="TE">TE (Third Year)</option>
          <option value="BE">BE (Fourth Year)</option>
        </select>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label>Number of Divisions: </label>
        <input
          type="number"
          min="1"
          max="10"
          value={numDivisions}
          onChange={(e) => setNumDivisions(parseInt(e.target.value) || 1)}
          style={{ marginLeft: '10px', padding: '5px', width: '80px' }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <strong>Divisions: </strong>
        <span style={{ color: '#6c757d' }}>
          {generateDivisionNames(selectedYear, numDivisions)}
        </span>
      </div>
      <button type="button" onClick={addSubject} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', marginBottom: '20px', cursor: 'pointer' }}>
        Add Subject
      </button>
      {subjects.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ border: '1px solid #dee2e6', padding: '10px' }}>Course Code</th>
              <th style={{ border: '1px solid #dee2e6', padding: '10px' }}>Subject Name</th>
              <th style={{ border: '1px solid #dee2e6', padding: '10px' }}>Type</th>
              <th style={{ border: '1px solid #dee2e6', padding: '10px' }}>Credits</th>
              <th style={{ border: '1px solid #dee2e6', padding: '10px' }}>Hours/Week</th>
              <th style={{ border: '1px solid #dee2e6', padding: '10px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, index) => (
              <tr key={index}>
                <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                  <input
                    type="text"
                    value={subject.courseCode}
                    onChange={(e) => updateSubject(index, 'courseCode', e.target.value)}
                    placeholder="CSE301"
                    style={{ width: '100%', padding: '5px', border: '1px solid #ccc', textTransform: 'uppercase' }}
                    maxLength="10"
                  />
                </td>
                <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                  <input
                    type="text"
                    value={subject.name}
                    onChange={(e) => updateSubject(index, 'name', e.target.value)}
                    placeholder="Subject Name"
                    style={{ width: '100%', padding: '5px', border: '1px solid #ccc' }}
                  />
                </td>
                <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                  <select value={subject.type} onChange={(e) => updateSubject(index, 'type', e.target.value)} style={{ width: '100%', padding: '5px' }}>
                    <option value="TH">TH (Theory)</option>
                    <option value="PR">PR (Practical)</option>
                    <option value="VAP">VAP (Value Added Program)</option>
                    <option value="OE">OE (Open Elective)</option>
                  </select>
                </td>
                <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    value={subject.credits}
                    onChange={(e) => updateSubject(index, 'credits', e.target.value)}
                    placeholder="Credits"
                    style={{ width: '100%', padding: '5px', border: '1px solid #ccc' }}
                  />
                </td>
                <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    value={subject.hoursPerWeek}
                    onChange={(e) => updateSubject(index, 'hoursPerWeek', e.target.value)}
                    placeholder="Hours/Week"
                    style={{ width: '100%', padding: '5px', border: '1px solid #ccc' }}
                  />
                </td>
                <td style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center' }}>
                  <button type="button" onClick={() => removeSubject(index)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {subjects.length > 0 && (
        <div style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '5px', marginBottom: '20px', fontSize: '14px' }}>
          <strong>📋 Course Code Guidelines:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>Use unique codes like CSE301, CSE301P, CSE302</li>
            <li>Theory and Practical can have different codes for same subject</li>
            <li>Example: CSE301 (OOP Theory), CSE301P (OOP Practical)</li>
            <li>No duplicate course codes allowed</li>
          </ul>
        </div>
      )}
      <button onClick={handleSubmit} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
        Save {selectedYear} Syllabus
      </button>
    </div>
  );
};

export default Syllabus;
