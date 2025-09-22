import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Lecture = () => {
  const [selectedYear, setSelectedYear] = useState('SE');
  const [selectedDivision, setSelectedDivision] = useState('A');
  const [divisions, setDivisions] = useState([]); // ADD THIS LINE
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [teacherWorkload, setTeacherWorkload] = useState({});

  const fetchTeachers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/teachers');
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  // ADD THIS FUNCTION - COPIED FROM LAB.JSX
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

  const loadSubjects = useCallback(() => {
    // Sample theory subjects based on year and division
    const theorySubjects = {
      SE: {
        A: [
          { name: 'Discrete Mathematics', type: 'TH', hoursPerWeek: 3 },
          { name: 'Data Structures', type: 'TH', hoursPerWeek: 2 },
          { name: 'Introduction to Artificial Intelligence', type: 'TH', hoursPerWeek: 2 },
          { name: 'Principles of Managements', type: 'TH', hoursPerWeek: 2 },
          { name: 'Industrial Psychology', type: 'TH', hoursPerWeek: 2 },
          { name: 'Community Engagement Project*/Field Project*', type: 'TH', hoursPerWeek: 4 },
          { name: 'Web Designing', type: 'TH', hoursPerWeek: 2 }
        ],
        B: [
          { name: 'Advanced Mathematics', type: 'TH', hoursPerWeek: 3 },
          { name: 'Computer Networks', type: 'TH', hoursPerWeek: 2 },
          { name: 'Machine Learning', type: 'TH', hoursPerWeek: 2 },
          { name: 'Software Engineering', type: 'TH', hoursPerWeek: 3 },
          { name: 'Database Systems', type: 'TH', hoursPerWeek: 2 }
        ]
      },
      TE: {
        A: [
          { name: 'Algorithm Analysis', type: 'TH', hoursPerWeek: 3 },
          { name: 'Computer Graphics', type: 'TH', hoursPerWeek: 2 },
          { name: 'Distributed Systems', type: 'TH', hoursPerWeek: 2 },
          { name: 'Cyber Security', type: 'TH', hoursPerWeek: 3 }
        ]
      },
      BE: {
        A: [
          { name: 'Project Management', type: 'TH', hoursPerWeek: 2 },
          { name: 'Advanced AI', type: 'TH', hoursPerWeek: 3 },
          { name: 'Blockchain Technology', type: 'TH', hoursPerWeek: 2 }
        ]
      }
    };

    setSubjects(theorySubjects[selectedYear]?.[selectedDivision] || []);
  }, [selectedYear, selectedDivision]);

  const calculateTeacherWorkload = useCallback(() => {
    const workload = {};
    
    // Initialize workload for all teachers
    teachers.forEach(teacher => {
      workload[teacher.name] = {
        lectureHours: 0,
        labHours: 0, // From lab assignments (for consistency)
        totalHours: 0,
        maxHours: teacher.maxHours || 20,
        availableHours: teacher.maxHours || 20
      };
    });

    // Calculate lecture hours from assignments
    subjects.forEach(subject => {
      if (assignments[subject.name]) {
        const teacherName = assignments[subject.name];
        if (workload[teacherName]) {
          workload[teacherName].lectureHours += subject.hoursPerWeek;
        }
      }
    });

    // TODO: Add lab hours from lab assignments when integrated
    // For now, using sample data to match the image
    const sampleLabHours = {
      'Dr. Smith': 3,
      'darshan': 3,
      'Manisha': 12,
      'Pranav': 24,
      'sharvi': 39
    };

    // Calculate totals and availability
    Object.keys(workload).forEach(teacherName => {
      const teacher = workload[teacherName];
      teacher.labHours = sampleLabHours[teacherName] || 0;
      teacher.totalHours = teacher.lectureHours + teacher.labHours;
      teacher.availableHours = teacher.maxHours - teacher.totalHours;
    });

    setTeacherWorkload(workload);
  }, [assignments, teachers, subjects]);

  // MODIFY THIS useEffect - ADD fetchDivisions
  useEffect(() => {
    loadSubjects();
    fetchTeachers();
    fetchDivisions(); // ADD THIS LINE
  }, [loadSubjects]);

  // ADD THIS useEffect - FETCH DIVISIONS WHEN YEAR CHANGES
  useEffect(() => {
    fetchDivisions();
  }, [selectedYear]);

  // Calculate teacher workload when assignments change
  useEffect(() => {
    calculateTeacherWorkload();
  }, [calculateTeacherWorkload]);

  const handleTeacherAssignment = (subjectName, teacherName) => {
    setAssignments(prev => ({
      ...prev,
      [subjectName]: teacherName
    }));
  };

  const getWorkloadStatus = (availableHours) => {
    if (availableHours < 0) {
      return { color: '#d32f2f', text: 'Overloaded', icon: '⚠️' };
    } else if (availableHours === 0) {
      return { color: '#ff9800', text: 'Fully Loaded', icon: '⚠️' };
    } else if (availableHours <= 2) {
      return { color: '#ff9800', text: 'Nearly Full', icon: '⚠️' };
    } else {
      return { color: '#2e7d32', text: 'Available', icon: '' };
    }
  };

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
          {/* REPLACE THE HARDCODED SELECT WITH DYNAMIC ONE */}
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

      {/* Rest of the component remains the same... */}
      {/* Subject Assignment Table */}
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
                <tr key={index} style={{ 
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
                      value={assignments[subject.name] || ''}
                      onChange={(e) => handleTeacherAssignment(subject.name, e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        minWidth: '150px'
                      }}
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((teacher, idx) => (
                        <option key={idx} value={teacher.name}>
                          {teacher.name}
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

      {/* Teacher Workload Summary */}
      <div>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#333'
        }}>
          Teacher Workload Summary
        </h2>

        {/* Workload Summary Table */}
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
              {Object.entries(teacherWorkload).map(([teacherName, workload], index) => {
                const status = getWorkloadStatus(workload.availableHours);
                return (
                  <tr key={index} style={{ 
                    borderBottom: index < Object.entries(teacherWorkload).length - 1 ? '1px solid #dee2e6' : 'none',
                    backgroundColor: index % 2 === 0 ? '#fdfdfd' : 'white'
                  }}>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      {teacherName}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {workload.lectureHours}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {workload.labHours}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {workload.totalHours}/{workload.maxHours}
                    </td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: status.color,
                      fontWeight: workload.availableHours < 0 ? '600' : '400'
                    }}>
                      {workload.availableHours} {status.icon}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Status Summary */}
        <div style={{ 
          marginTop: '20px',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {Object.entries(teacherWorkload).map(([name, workload]) => {
              const status = getWorkloadStatus(workload.availableHours);
              if (workload.availableHours <= 0) {
                return (
                  <span key={name} style={{ color: status.color }}>
                    <strong>{name}:</strong> {workload.totalHours}/{workload.maxHours} hours {status.text}
                  </span>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lecture;
