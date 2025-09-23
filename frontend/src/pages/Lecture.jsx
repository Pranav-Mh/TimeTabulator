import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Lecture = () => {
  const [selectedYear, setSelectedYear] = useState('SE');
  const [selectedDivision, setSelectedDivision] = useState('A');
  const [divisions, setDivisions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherWorkload, setTeacherWorkload] = useState([]); // ✅ FIXED: Use array like Lab component
  const [loading, setLoading] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ✅ CHECK ACCESS FIRST
  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/lectures/access-check');
      setCanAccess(res.data.canAccess);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Access denied');
      setCanAccess(false);
    }
  };

  // ✅ FETCH DIVISIONS (same as Lab component)
  const fetchDivisions = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/lectures/divisions/${selectedYear}`);
      setDivisions(res.data);
      if (res.data.length > 0) {
        const firstDivision = res.data[0].name.split('-')[1]; // SE-A -> A
        setSelectedDivision(firstDivision);
      }
    } catch (err) {
      console.error('Error fetching divisions:', err);
    }
  };

  // ✅ FETCH TEACHERS
  const fetchTeachers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/teachers');
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  // ✅ FETCH REAL SUBJECTS FROM DATABASE
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/lectures/subjects/${selectedYear}/${selectedDivision}`);
      setSubjects(res.data.subjects || []);
    } catch (err) {
      console.error('Error fetching lecture subjects:', err);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: USE SAME WORKLOAD API AS LAB COMPONENT
  const fetchTeacherWorkload = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/lectures/teacher-workload');
      setTeacherWorkload(res.data); // This should return array like Lab component
    } catch (err) {
      console.error('Error fetching teacher workload:', err);
      setTeacherWorkload([]);
    }
  };

  // ✅ REAL TEACHER ASSIGNMENT (saves to database)
  const handleTeacherAssignment = async (subjectId, teacherId) => {
    if (!teacherId) return;

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const division = divisions.find(d => d.name === `${selectedYear}-${selectedDivision}`);
      
      await axios.post('http://localhost:5000/api/lectures/assign', {
        subjectId,
        divisionId: division._id,
        teacherId
      });

      setSuccessMessage('✅ Lecture teacher assigned successfully!');
      fetchSubjects();
      fetchTeacherWorkload();
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to assign lecture teacher';
      setErrorMessage(errorMsg);
    }
  };

  // ✅ LOAD DATA WHEN DEPENDENCIES CHANGE
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

  // ✅ ACCESS CONTROL
  if (!canAccess) {
    return (
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1>Assign Teachers to Theory Subjects</h1>
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center',
          marginTop: '50px'
        }}>
          <h2>🔒 Access Denied</h2>
          <p>Complete SE and TE syllabus configuration before accessing lecture assignments.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          textAlign: 'center',
          marginBottom: '8px',
          color: '#333'
        }}>
          Assign Teachers to Theory Subjects
        </h1>
      </div>

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
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        marginBottom: '30px',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: '600', fontSize: '16px' }}>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="SE">SE</option>
            <option value="TE">TE</option>
            <option value="BE">BE</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: '600', fontSize: '16px' }}>Division:</label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            {divisions.map(division => {
              const divLetter = division.name.split('-')[1]; // SE-A -> A
              return <option key={division._id} value={divLetter}>{divLetter}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', color: '#6c757d', marginTop: '50px' }}>
          <p>Loading subjects...</p>
        </div>
      )}

      {/* Subject Assignment Table */}
      {!loading && subjects.length > 0 ? (
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057'
                  }}>
                    Subject
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057'
                  }}>
                    Type
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057'
                  }}>
                    Hours/Week
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057'
                  }}>
                    Assign Teacher
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject, index) => (
                  <tr key={subject._id} style={{ 
                    borderBottom: index < subjects.length - 1 ? '1px solid #dee2e6' : 'none',
                    backgroundColor: index % 2 === 0 ? '#fdfdfd' : 'white'
                  }}>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {subject.name}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {subject.type}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {subject.hoursPerWeek}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <select
                        value={subject.assignedTeacher?._id || ''}
                        onChange={(e) => handleTeacherAssignment(subject._id, e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          minWidth: '150px'
                        }}
                      >
                        <option value="">Select Teacher</option>
                        {teachers.map((teacher) => (
                          <option key={teacher._id} value={teacher._id}>
                            {teacher.name} ({teacher.teacherId})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading && (
        <div style={{ textAlign: 'center', color: '#6c757d', marginTop: '50px' }}>
          <p>No theory subjects found for {selectedYear}-{selectedDivision}</p>
        </div>
      )}

      {/* ✅ FIXED: Teacher Workload Summary (same format as Lab component) */}
      {teacherWorkload.length > 0 && (
        <div>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            marginBottom: '20px',
            color: '#333'
          }}>
            Teacher Workload Summary
          </h2>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057'
                  }}>
                    Teacher Name
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057'
                  }}>
                    Lecture Hours
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057'
                  }}>
                    Lab Hours
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057'
                  }}>
                    Total Hours
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057'
                  }}>
                    Available Hours
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* ✅ FIXED: Use same structure as Lab component */}
                {teacherWorkload.map((teacher, index) => (
                  <tr key={teacher.teacherId} style={{ 
                    borderBottom: index < teacherWorkload.length - 1 ? '1px solid #dee2e6' : 'none',
                    backgroundColor: index % 2 === 0 ? '#fdfdfd' : 'white'
                  }}>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      {teacher.name}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {teacher.lectureHours}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {teacher.labHours}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {teacher.totalHours}/{teacher.maxHours}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: teacher.availableHours <= 0 ? '#d32f2f' : teacher.availableHours <= 2 ? '#ff9800' : '#2e7d32',
                      fontWeight: teacher.availableHours <= 0 ? '600' : '400'
                    }}>
                      {teacher.availableHours}
                      {teacher.availableHours <= 0 && <span> ⚠️</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lecture;
