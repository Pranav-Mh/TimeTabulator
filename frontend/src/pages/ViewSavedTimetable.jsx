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
  const [finalGrid, setFinalGrid] = useState(null);

  useEffect(() => {
    fetchSavedTimetable();
    // eslint-disable-next-line
  }, [id]);

  const fetchSavedTimetable = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching saved timetable:', id);

      const res = await axios.get(
        `http://localhost:5000/api/generator/saved-timetables/${id}`
      );

      if (!res.data.success) {
        throw new Error('Failed to load timetable');
      }

      setSavedTimetable(res.data.savedTimetable);
      setFinalGrid(res.data.finalTimetableGrid); // ✅ KEY FIX

      console.log('✅ Final timetable grid loaded');

    } catch (err) {
      console.error(err);
      setError('Failed to load saved timetable');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleString();

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>⏳ Loading timetable...</h2>
      </div>
    );
  }

  if (error || !savedTimetable || !finalGrid) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>❌ {error || 'Timetable not found'}</h2>
        <button onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{ marginBottom: 20 }}
      >
        ← Back to Dashboard
      </button>

      <h1>📅 {savedTimetable.name}</h1>
      <p>Saved on {formatDate(savedTimetable.savedAt)}</p>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 20, margin: '20px 0' }}>
        <div>🔬 Labs: {savedTimetable.metadata.labSessions}</div>
        <div>🎓 Lectures: {savedTimetable.metadata.lectureSessions}</div>
        <div>🏫 Divisions: {savedTimetable.divisions.length}</div>
      </div>

      {/* ✅ FINAL TIMETABLE GRID */}
      <TimetableGrid
        timetableData={finalGrid}
        readOnly={true}
      />
    </div>
  );
};

export default ViewSavedTimetable;
