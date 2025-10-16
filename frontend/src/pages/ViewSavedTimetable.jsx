import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import TimetableGrid from '../components/TimetableGrid';

const ViewSavedTimetable = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedTimetable, setSavedTimetable] = useState(null);
  const [labScheduleData, setLabScheduleData] = useState(null);
  const [lectureScheduleData, setLectureScheduleData] = useState(null);
  const [generatedTimetable, setGeneratedTimetable] = useState(null);

  useEffect(() => {
    fetchSavedTimetable();
  }, [id]);

  const fetchSavedTimetable = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching timetable with ID:', id);
      const response = await axios.get(`http://localhost:5000/api/generator/saved-timetables/${id}`);
      
      console.log('Timetable data received:', response.data);
      
      if (response.data.success) {
        setSavedTimetable(response.data.savedTimetable);
        
        // ✅ Create a dummy timetable structure to trigger full grid display
        // This structure tells TimetableGrid to render the full grid
        const divisions = response.data.savedTimetable.divisions || [];
        const timetableStructure = {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        days.forEach(day => {
          timetableStructure[day] = {};
          divisions.forEach(divName => {
            timetableStructure[day][divName] = {};
            // Create 8 time slots (adjust based on your config)
            for (let i = 1; i <= 8; i++) {
              timetableStructure[day][divName][i] = {
                activity: null,
                type: 'free'
              };
            }
          });
        });
        
        setGeneratedTimetable(timetableStructure);
        
        // Format lab schedule data exactly like Generator.jsx
        setLabScheduleData({
          success: true,
          scheduledLabs: response.data.labSessions || [],
          sessionsScheduled: response.data.labSessions?.length || 0
        });
        
        // Format lecture schedule data exactly like Generator.jsx
        setLectureScheduleData({
          success: true,
          scheduledLectures: response.data.lectureSessions || [],
          sessionsScheduled: response.data.lectureSessions?.length || 0
        });
      }
    } catch (err) {
      console.error('Error fetching saved timetable:', err);
      setError('Failed to load saved timetable');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <p style={{ fontSize: '18px', color: '#666' }}>Loading timetable...</p>
      </div>
    );
  }

  if (error || !savedTimetable) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          padding: '30px',
          borderRadius: '12px',
          border: '1px solid #f44336',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ marginBottom: '12px' }}>Error</h2>
          <p style={{ marginBottom: '24px' }}>{error || 'Timetable not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 600
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header with Back Button */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontWeight: 600
          }}
        >
          ← Back to Dashboard
        </button>
        
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
          📅 {savedTimetable.name}
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Saved on {formatDate(savedTimetable.savedAt)}
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '30px'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2', marginBottom: '8px' }}>
            {savedTimetable.metadata?.labSessions || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>Lab Sessions</div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: '#e8f5e9',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c', marginBottom: '8px' }}>
            {savedTimetable.metadata?.lectureSessions || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>Lecture Sessions</div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: '#fff3cd',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57c00', marginBottom: '8px' }}>
            {savedTimetable.divisions.length}
          </div>
          <div style={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>Divisions</div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: '#f3e5f5',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2', marginBottom: '8px' }}>
            {savedTimetable.academicYears.join(', ')}
          </div>
          <div style={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>Academic Years</div>
        </div>
      </div>

      {/* Summary Section */}
      <div style={{
        backgroundColor: '#e8f5e9',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '30px',
        border: '1px solid #c8e6c9'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2e7d32', marginBottom: '8px' }}>
          📊 Timetable Summary
        </h3>
        <div style={{ fontSize: '14px', color: '#1b5e20' }}>
          <strong>Lab Scheduling Results:</strong> {labScheduleData?.scheduledLabs?.length || 0} sessions scheduled | 
          Data Source: Live
          <br />
          <strong>Lecture Scheduling Results:</strong> {lectureScheduleData?.scheduledLectures?.length || 0} sessions scheduled | 
          Utilization: {savedTimetable.statistics?.lectureUtilization || 'N/A'}
        </div>
      </div>

      {/* ✅ MAIN TIMETABLE GRID - This will show the full day-wise grid */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#333' }}>
          Generated Timetable Structure with Lab & Lecture Assignments
        </h2>
        
        {generatedTimetable && labScheduleData && lectureScheduleData ? (
          <TimetableGrid
            timetableData={generatedTimetable}
            labScheduleData={labScheduleData}
            lectureScheduleData={lectureScheduleData}
          />
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ color: '#333', marginBottom: '8px' }}>No Schedule Data Available</h3>
            <p style={{ color: '#666' }}>
              This timetable doesn't have any lab or lecture sessions associated with it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewSavedTimetable;
