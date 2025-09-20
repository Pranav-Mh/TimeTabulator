import React from 'react';

const Generator = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Timetable Generator</h1>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '40px', 
        borderRadius: '8px', 
        textAlign: 'center',
        border: '1px solid #dee2e6'
      }}>
        <h2 style={{ color: '#495057', marginBottom: '20px' }}>
          🚀 Automatic Timetable Generation
        </h2>
        
        <p style={{ fontSize: '18px', color: '#6c757d', marginBottom: '30px' }}>
          Generate optimized timetables based on your configured data
        </p>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '8px', 
          marginBottom: '30px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ color: '#495057', marginBottom: '15px' }}>Prerequisites Check</h3>
          <div style={{ textAlign: 'left', display: 'inline-block' }}>
            <div style={{ marginBottom: '10px' }}>
              ✅ <strong>Syllabus:</strong> Configure SE and TE subjects
            </div>
            <div style={{ marginBottom: '10px' }}>
              ✅ <strong>Teachers:</strong> Add faculty members
            </div>
            <div style={{ marginBottom: '10px' }}>
              ✅ <strong>Lectures:</strong> Assign theory subjects to teachers
            </div>
            <div style={{ marginBottom: '10px' }}>
              ✅ <strong>Labs:</strong> Assign practical subjects to batches
            </div>
            <div style={{ marginBottom: '10px' }}>
              ✅ <strong>Resources:</strong> Configure classrooms and time slots
            </div>
          </div>
        </div>
        
        <button
          onClick={() => alert('Timetable generation coming soon!')}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '15px 40px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(40, 167, 69, 0.3)'
          }}
        >
          🎯 Generate Timetable
        </button>
        
        <div style={{ marginTop: '30px', fontSize: '14px', color: '#6c757d' }}>
          <p>
            <strong>Note:</strong> Complete all previous steps before generating the timetable.
            The system will automatically optimize schedules based on teacher availability,
            room constraints, and subject requirements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Generator;
