import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../index.css';

const Lab = () => {
  const [selectedYear, setSelectedYear] = useState('SE');
  const [selectedDivision, setSelectedDivision] = useState('A');
  const [divisions, setDivisions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherWorkload, setTeacherWorkload] = useState([]);
  const [canAccess, setCanAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (canAccess) {
      fetchDivisions();
      fetchTeachers();
      fetchTeacherWorkload();
    }
  }, [selectedYear, canAccess]);

  useEffect(() => {
    if (canAccess && divisions.length > 0) {
      fetchSubjects();
    }
  }, [selectedYear, selectedDivision, canAccess, divisions]);

  const checkAccess = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/labs/access-check');
      setCanAccess(res.data.canAccess);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Access denied');
      setCanAccess(false);
    }
  };

  const fetchDivisions = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/labs/divisions/${selectedYear}`);
      setDivisions(res.data);
      if (res.data.length > 0) {
        const firstDivision = res.data[0].name.split('-')[1]; // SE-A -> A
        setSelectedDivision(firstDivision);
      }
    } catch (err) {
      console.error('Error fetching divisions:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/teachers');
      setTeachers(res.data);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/labs/subjects/${selectedYear}/${selectedDivision}`);
      setSubjects(res.data.subjects || []);
    } catch (err) {
      console.error('Error fetching lab subjects:', err);
      setSubjects([]);
    }
  };

  const fetchTeacherWorkload = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/labs/teacher-workload');
      setTeacherWorkload(res.data);
    } catch (err) {
      console.error('Error fetching teacher workload:', err);
    }
  };

  const handleTeacherAssignment = async (subjectId, batchNumber, teacherId) => {
    if (!teacherId) return;

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const division = divisions.find(d => d.name === `${selectedYear}-${selectedDivision}`);
      
      await axios.post('http://localhost:5000/api/labs/assign', {
        subjectId,
        divisionId: division._id,
        batchNumber,
        teacherId
      });

      setSuccessMessage('✅ Lab teacher assigned successfully!');
      fetchSubjects();
      fetchTeacherWorkload();
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to assign lab teacher';
      setErrorMessage(errorMsg);
    }
  };

  if (!canAccess) {
    return (
      <div className="lab-page">
        <h1>Assign Teachers for Practical Lab</h1>
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center',
          marginTop: '50px'
        }}>
          <h2>🔒 Access Denied</h2>
          <p>Complete both SE and TE syllabus configuration before accessing lab assignments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lab-page">
      <h1>Assign Teachers for Practical Lab</h1>

      {/* Error/Success Messages */}
      {errorMessage && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '10px',
          border: '1px solid red'
        }}>
          ⚠️ {errorMessage}
        </div>
      )}
      
      {successMessage && (
        <div style={{ 
          color: 'green', 
          backgroundColor: '#e6ffe6', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '10px',
          border: '1px solid green'
        }}>
          {successMessage}
        </div>
      )}

      {/* Year and Division Selection */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label>Year: </label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value="SE">SE</option>
            <option value="TE">TE</option>
            <option value="BE">BE</option>
          </select>
        </div>
        
        <div>
          <label>Division: </label>
          <select 
            value={selectedDivision} 
            onChange={(e) => setSelectedDivision(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            {divisions.map(division => {
              const divLetter = division.name.split('-')[1]; // SE-A -> A
              return <option key={division._id} value={divLetter}>{divLetter}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Lab Subjects Table */}
      {subjects.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ border: '1px solid #dee2e6', padding: '12px' }}>Lab Subject Name</th>
              <th style={{ border: '1px solid #dee2e6', padding: '12px' }}>Hours/Week</th>
              <th style={{ border: '1px solid #dee2e6', padding: '12px' }}>{selectedYear}-{selectedDivision}1</th>
              <th style={{ border: '1px solid #dee2e6', padding: '12px' }}>{selectedYear}-{selectedDivision}2</th>
              <th style={{ border: '1px solid #dee2e6', padding: '12px' }}>{selectedYear}-{selectedDivision}3</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(subject => (
              <tr key={subject._id}>
                <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{subject.name}</td>
                <td style={{ border: '1px solid #dee2e6', padding: '10px', textAlign: 'center' }}>{subject.hoursPerWeek}</td>
                {subject.batches?.map(batch => (
                  <td key={batch.batchNumber} style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                    <select
                      value={batch.assignedTeacher?._id || ''}
                      onChange={(e) => handleTeacherAssignment(subject._id, batch.batchNumber, e.target.value)}
                      style={{ width: '100%', padding: '5px' }}
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(teacher => (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.name} ({teacher.teacherId})
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ textAlign: 'center', color: '#6c757d', marginTop: '50px' }}>
          <p>No practical subjects found for {selectedYear}-{selectedDivision}</p>
        </div>
      )}

      {/* Teacher Workload Summary */}
      {teacherWorkload.length > 0 && (
        <div>
          <h3>Teacher Workload Summary</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ border: '1px solid #dee2e6', padding: '8px' }}>Teacher Name</th>
                <th style={{ border: '1px solid #dee2e6', padding: '8px' }}>Lecture Hours</th>
                <th style={{ border: '1px solid #dee2e6', padding: '8px' }}>Lab Hours</th>
                <th style={{ border: '1px solid #dee2e6', padding: '8px' }}>Total Hours</th>
                <th style={{ border: '1px solid #dee2e6', padding: '8px' }}>Available Hours</th>
              </tr>
            </thead>
            <tbody>
              {teacherWorkload.map(teacher => (
                <tr key={teacher.teacherId}>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>{teacher.name}</td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center' }}>{teacher.lectureHours}</td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center' }}>{teacher.labHours}</td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center' }}>{teacher.totalHours}/{teacher.maxHours}</td>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '8px', 
                    textAlign: 'center',
                    color: teacher.availableHours <= 0 ? 'red' : 'green'
                  }}>
                    {teacher.availableHours}
                    {teacher.availableHours <= 0 && <span> ⚠️</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Lab;
