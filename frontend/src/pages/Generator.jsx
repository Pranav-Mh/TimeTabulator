import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Generator = () => {
  const [timetableConfig, setTimetableConfig] = useState({
    year: 'SE',
    division: 'A',
    subjects: [],
    teachers: []
  });
  
  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState([]);

  // Sample data
  const [sampleSubjects] = useState([
    { 
      name: 'Data Structures', 
      teacher: 'Dr. Smith', 
      lectureHours: 3, 
      labHours: 2,
      batchTeachers: { A1: 'Dr. Smith', A2: 'Prof. Jones', A3: 'Dr. Smith' }
    },
    { 
      name: 'Operating System', 
      teacher: 'Prof. Johnson', 
      lectureHours: 4, 
      labHours: 0 
    },
    { 
      name: 'Database Management', 
      teacher: 'Dr. Wilson', 
      lectureHours: 3, 
      labHours: 2,
      batchTeachers: { A1: 'Dr. Wilson', A2: 'Dr. Wilson', A3: 'Prof. Davis' }
    }
  ]);

  const [sampleTeachers] = useState([
    { name: 'Dr. Smith', maxHours: 20 },
    { name: 'Prof. Johnson', maxHours: 18 },
    { name: 'Dr. Wilson', maxHours: 22 },
    { name: 'Prof. Jones', maxHours: 16 },
    { name: 'Prof. Davis', maxHours: 20 }
  ]);

  useEffect(() => {
    fetchRooms();
    setTimetableConfig(prev => ({
      ...prev,
      subjects: sampleSubjects,
      teachers: sampleTeachers
    }));
  }, [sampleSubjects, sampleTeachers]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/resources/rooms');
      setRooms(response.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const generateTimetable = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (rooms.length === 0) {
        setError('No rooms configured. Please add classrooms and labs in Configure Resources first.');
        return;
      }

      const response = await axios.post('http://localhost:5000/api/timetable/generate', timetableConfig);
      
      setMessage(response.data.message);
      setGeneratedTimetable(response.data.timetables);
      
    } catch (err) {
      console.error('Error generating timetable:', err);
      setError(err.response?.data?.error || 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  };

  const formatTimetableGrid = (entries) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = ['9:00-10:00', '10:00-11:00', '11:30-12:30', '12:30-1:30', '2:30-3:30', '3:30-4:30'];
    
    const grid = {};
    days.forEach(day => {
      grid[day] = {};
      timeSlots.forEach(slot => {
        grid[day][slot] = null;
      });
    });
    
    entries.forEach(entry => {
      if (grid[entry.day] && grid[entry.day][entry.timeSlot] !== undefined) {
        grid[entry.day][entry.timeSlot] = entry;
      }
    });
    
    return { grid, days, timeSlots };
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          🚀 Smart Timetable Generator
        </h1>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          Generate intelligent timetables with automatic lab batch scheduling and teacher conflict resolution
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ 
          color: '#d32f2f', 
          backgroundColor: '#ffebee', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #f44336'
        }}>
          ❌ {error}
        </div>
      )}

      {message && (
        <div style={{ 
          color: '#2e7d32', 
          backgroundColor: '#e8f5e8', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #4caf50'
        }}>
          ✅ {message}
        </div>
      )}

      {/* Configuration */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginBottom: '16px' }}>📋 Configuration</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Academic Year</label>
            <select
              value={timetableConfig.year}
              onChange={(e) => setTimetableConfig(prev => ({ ...prev, year: e.target.value }))}
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="SE">Second Year (SE)</option>
              <option value="TE">Third Year (TE)</option>
              <option value="BE">Fourth Year (BE)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Division</label>
            <select
              value={timetableConfig.division}
              onChange={(e) => setTimetableConfig(prev => ({ ...prev, division: e.target.value }))}
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="A">Division A</option>
              <option value="B">Division B</option>
              <option value="C">Division C</option>
            </select>
          </div>
        </div>

        {/* Room Status */}
        <div style={{ marginBottom: '20px' }}>
          <h4>📊 Resource Status</h4>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ padding: '8px 16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              Classrooms: {rooms.filter(r => r.type === 'CR').length}
            </div>
            <div style={{ padding: '8px 16px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
              Labs: {rooms.filter(r => r.type === 'LAB').length}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateTimetable}
          disabled={loading || rooms.length === 0}
          style={{
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {loading ? '⏳ Generating...' : '🚀 Generate Smart Timetable'}
        </button>
      </div>

      {/* Generated Timetables */}
      {generatedTimetable && generatedTimetable.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '20px' }}>📅 Generated Timetables</h3>
          
          {generatedTimetable.map((timetable, index) => {
            const { grid, days, timeSlots } = formatTimetableGrid(timetable.entries);
            
            return (
              <div key={index} style={{ marginBottom: '30px' }}>
                <h4 style={{ 
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  borderRadius: '8px'
                }}>
                  {timetable.year}-{timetable.division} 
                  {timetable.batch !== 'ALL' ? ` Batch ${timetable.batch}` : ' (All Batches)'}
                </h4>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <thead>
                      <tr>
                        <th style={{ 
                          padding: '12px', 
                          border: '1px solid #ddd', 
                          backgroundColor: '#f8f9fa',
                          fontWeight: '600'
                        }}>
                          Time / Day
                        </th>
                        {days.map(day => (
                          <th key={day} style={{ 
                            padding: '12px', 
                            border: '1px solid #ddd', 
                            backgroundColor: '#f8f9fa',
                            fontWeight: '600'
                          }}>
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map(slot => (
                        <tr key={slot}>
                          <td style={{ 
                            padding: '12px', 
                            border: '1px solid #ddd', 
                            backgroundColor: '#f8f9fa',
                            fontWeight: '600'
                          }}>
                            {slot}
                          </td>
                          {days.map(day => {
                            const entry = grid[day][slot];
                            return (
                              <td key={`${day}-${slot}`} style={{ 
                                padding: '8px', 
                                border: '1px solid #ddd',
                                textAlign: 'center',
                                backgroundColor: entry ? (entry.isLabSession ? '#e8f5e8' : '#e3f2fd') : 'white'
                              }}>
                                {entry ? (
                                  <div>
                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                      {entry.subject}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                      {entry.teacher}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                      {entry.room} {entry.batch !== 'ALL' ? `(${entry.batch})` : ''}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ color: '#ccc' }}>Free</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Generator;
