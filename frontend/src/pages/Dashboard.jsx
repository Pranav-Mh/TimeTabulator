import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [savedTimetables, setSavedTimetables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchSavedTimetables();
  }, []);

  const fetchSavedTimetables = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get('http://localhost:5000/api/generator/saved-timetables');
      
      if (response.data.success) {
        setSavedTimetables(response.data.savedTimetables);
      }
    } catch (err) {
      console.error('Error fetching saved timetables:', err);
      setError('Failed to load saved timetables');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`http://localhost:5000/api/generator/saved-timetables/${id}`);
      
      if (response.data.success) {
        setSavedTimetables(savedTimetables.filter(t => t._id !== id));
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Error deleting timetable:', err);
      setError('Failed to delete timetable');
    }
  };

  const handleView = (id) => {
    navigate(`/view-timetable/${id}`);
  };

  const handleGenerateNew = () => {
    navigate('/generator');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
          Previous Timetable
        </h1>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #f44336',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>Loading saved timetables...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && savedTimetables.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '2px dashed #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
          <h3 style={{ color: '#333', marginBottom: '8px' }}>No Saved Timetables Yet</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Generate your first timetable to see it here
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && savedTimetables.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#e8eaf6' }}>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#333',
                  borderBottom: '2px solid #ddd'
                }}>
                  Name
                </th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#333',
                  borderBottom: '2px solid #ddd'
                }}>
                  Time
                </th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#333',
                  borderBottom: '2px solid #ddd'
                }}>
                  Date
                </th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: '#333',
                  borderBottom: '2px solid #ddd'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {savedTimetables.map((timetable, index) => (
                <tr 
                  key={timetable._id}
                  style={{
                    backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fafafa' : 'white'}
                >
                  <td style={{
                    padding: '16px',
                    color: '#333',
                    borderBottom: '1px solid #eee'
                  }}>
                    {timetable.name}
                  </td>
                  <td style={{
                    padding: '16px',
                    color: '#666',
                    borderBottom: '1px solid #eee'
                  }}>
                    {formatTime(timetable.savedAt)}
                  </td>
                  <td style={{
                    padding: '16px',
                    color: '#666',
                    borderBottom: '1px solid #eee'
                  }}>
                    {formatDate(timetable.savedAt)}
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center',
                    borderBottom: '1px solid #eee'
                  }}>
                    {deleteConfirm === timetable._id ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleDelete(timetable._id)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleView(timetable._id)}
                          style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: 600,
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                        >
                          View
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(timetable._id)}
                          style={{
                            padding: '8px 12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate New Timetable Button - Centered at Bottom */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button
          onClick={handleGenerateNew}
          style={{
            padding: '14px 32px',
            fontSize: '16px',
            fontWeight: 600,
            backgroundColor: '#5b7cff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(91, 124, 255, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4a6be8';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(91, 124, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#5b7cff';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(91, 124, 255, 0.3)';
          }}
        >
          Generate New Timetable
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
