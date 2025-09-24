import React, { useState } from 'react';
import axios from 'axios';

const ConflictResolution = ({ conflicts, timetableId, onResolve }) => {
  const [resolutions, setResolutions] = useState({});
  const [resolving, setResolving] = useState(false);

  const handleResolutionChange = (conflictIndex, resolution) => {
    setResolutions(prev => ({
      ...prev,
      [conflictIndex]: resolution
    }));
  };

  const handleResolveAll = async () => {
    setResolving(true);
    try {
      await axios.post(`http://localhost:5000/api/timetable/resolve-conflicts/${timetableId}`, {
        conflictResolutions: resolutions
      });
      onResolve();
    } catch (error) {
      console.error('Error resolving conflicts:', error);
    }
    setResolving(false);
  };

  const getConflictIcon = (type) => {
    switch (type) {
      case 'teacher_conflict': return '👨‍🏫';
      case 'room_conflict': return '🏢';
      case 'workload_exceeded': return '⚠️';
      case 'scheduling_conflict': return '📅';
      case 'lab_scheduling_conflict': return '🔬';
      default: return '❗';
    }
  };

  const getConflictColor = (type) => {
    switch (type) {
      case 'teacher_conflict': return '#ff9800';
      case 'room_conflict': return '#f44336';
      case 'workload_exceeded': return '#d32f2f';
      case 'scheduling_conflict': return '#673ab7';
      case 'lab_scheduling_conflict': return '#009688';
      default: return '#757575';
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      border: '1px solid #ff9800'
    }}>
      <h3 style={{ 
        color: '#ff9800', 
        marginBottom: '15px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        ⚠️ Conflicts Detected ({conflicts.length})
      </h3>
      
      <p style={{ marginBottom: '20px', color: '#666' }}>
        The following conflicts were found during timetable generation. Please review and apply suggested resolutions:
      </p>

      <div style={{ marginBottom: '20px' }}>
        {conflicts.map((conflict, index) => (
          <div key={index} style={{
            border: `1px solid ${getConflictColor(conflict.type)}`,
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px',
            backgroundColor: `${getConflictColor(conflict.type)}08`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>
                {getConflictIcon(conflict.type)}
              </span>
              <div style={{ flex: 1 }}>
                <h4 style={{ 
                  margin: '0 0 5px 0', 
                  color: getConflictColor(conflict.type),
                  textTransform: 'capitalize'
                }}>
                  {conflict.type.replace('_', ' ')}
                </h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                  {conflict.description}
                </p>
                {conflict.suggestion && (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    <strong>Suggestion:</strong> {conflict.suggestion}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Resolution Action:
              </label>
              <select
                value={resolutions[index] || ''}
                onChange={(e) => handleResolutionChange(index, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <option value="">Select resolution...</option>
                <option value="ignore">Ignore conflict</option>
                <option value="auto_resolve">Auto-resolve</option>
                <option value="manual_review">Mark for manual review</option>
                <option value="relax_constraints">Relax constraints</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onResolve()}
          style={{
            backgroundColor: '#757575',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Continue with Conflicts
        </button>
        <button
          onClick={handleResolveAll}
          disabled={resolving}
          style={{
            backgroundColor: resolving ? '#ccc' : '#ff9800',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: resolving ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          {resolving ? 'Resolving...' : 'Apply Resolutions'}
        </button>
      </div>
    </div>
  );
};

export default ConflictResolution;
