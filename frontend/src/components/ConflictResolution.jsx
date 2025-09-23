import React, { useState } from 'react';

const ConflictResolution = ({ conflicts, relaxationSuggestions, onResolve, loading }) => {
  const [selectedResolutions, setSelectedResolutions] = useState([]);

  // ✅ Handle resolution selection
  const toggleResolution = (suggestion, index) => {
    const resolutionId = `${suggestion.type}_${index}`;
    
    setSelectedResolutions(prev => {
      const existing = prev.find(r => r.id === resolutionId);
      if (existing) {
        return prev.filter(r => r.id !== resolutionId);
      } else {
        return [...prev, {
          id: resolutionId,
          type: suggestion.type,
          description: suggestion.description,
          impact: suggestion.impact,
          severity: suggestion.severity,
          data: suggestion
        }];
      }
    });
  };

  // ✅ Apply selected resolutions
  const applyResolutions = () => {
    if (selectedResolutions.length === 0) {
      alert('Please select at least one resolution to apply');
      return;
    }
    
    onResolve(selectedResolutions);
  };

  // ✅ Get conflict severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#2196f3';
      default: return '#6c757d';
    }
  };

  // ✅ Get conflict type icon
  const getConflictIcon = (type) => {
    switch (type) {
      case 'insufficient_lab_slots': return '🔬';
      case 'insufficient_lecture_hours': return '📚';
      case 'teacher_overload': return '👨‍🏫';
      case 'room_conflict': return '🏢';
      case 'time_conflict': return '⏰';
      default: return '⚠️';
    }
  };

  return (
    <div style={{
      backgroundColor: '#fff3e0',
      padding: '24px',
      borderRadius: '12px',
      marginBottom: '30px',
      border: '2px solid #ff9800'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <h3 style={{ margin: 0, color: '#e65100' }}>
          Conflict Resolution Required
        </h3>
        <span style={{
          backgroundColor: '#f44336',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {conflicts.length} Conflicts
        </span>
      </div>

      {/* Conflict Summary */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4 style={{ marginBottom: '12px', color: '#333' }}>🔍 Detected Conflicts:</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
          {conflicts.map((conflict, index) => (
            <div key={index} style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: `2px solid ${getSeverityColor(conflict.severity)}`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>
                  {getConflictIcon(conflict.type)}
                </span>
                <span style={{
                  fontWeight: 'bold',
                  color: getSeverityColor(conflict.severity)
                }}>
                  {conflict.type.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span style={{
                  backgroundColor: getSeverityColor(conflict.severity),
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {conflict.severity.toUpperCase()}
                </span>
              </div>
              
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                <strong>Subject:</strong> {conflict.subject || 'N/A'}
              </div>
              
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                <strong>Division:</strong> {conflict.division || 'N/A'}
              </div>
              
              {conflict.reason && (
                <div style={{ fontSize: '12px', color: '#d32f2f', fontStyle: 'italic' }}>
                  {conflict.reason}
                </div>
              )}

              {conflict.required && conflict.scheduled && (
                <div style={{ fontSize: '12px', color: '#d32f2f', marginTop: '4px' }}>
                  <strong>Required:</strong> {conflict.required} hours • 
                  <strong> Scheduled:</strong> {conflict.scheduled} hours •
                  <strong> Shortage:</strong> {conflict.required - conflict.scheduled} hours
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Resolution Suggestions */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4 style={{ marginBottom: '12px', color: '#333' }}>💡 Suggested Resolutions:</h4>
        
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Select the resolutions you want to apply. Each resolution shows the detailed impact it will have on your timetable.
        </p>

        {relaxationSuggestions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#6c757d',
            fontStyle: 'italic'
          }}>
            No automated resolutions available. Manual intervention may be required.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {relaxationSuggestions.map((suggestion, index) => {
              const resolutionId = `${suggestion.type}_${index}`;
              const isSelected = selectedResolutions.some(r => r.id === resolutionId);
              
              return (
                <div key={index} style={{
                  padding: '16px',
                  border: `2px solid ${isSelected ? '#4caf50' : '#ddd'}`,
                  borderRadius: '8px',
                  backgroundColor: isSelected ? '#f1f8e9' : '#f8f9fa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => toggleResolution(suggestion, index)}>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'start',
                    gap: '12px'
                  }}>
                    {/* Selection Checkbox */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: `2px solid ${isSelected ? '#4caf50' : '#ddd'}`,
                      borderRadius: '4px',
                      backgroundColor: isSelected ? '#4caf50' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px'
                    }}>
                      {isSelected && (
                        <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </div>

                    {/* Resolution Content */}
                    <div style={{ flex: 1 }}>
                      {/* Resolution Type */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          backgroundColor: getSeverityColor(suggestion.severity),
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {suggestion.type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        
                        <span style={{
                          fontSize: '12px',
                          color: '#666',
                          backgroundColor: '#e9ecef',
                          padding: '2px 6px',
                          borderRadius: '8px'
                        }}>
                          {suggestion.severity} impact
                        </span>
                      </div>

                      {/* Description */}
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px'
                      }}>
                        {suggestion.description}
                      </div>

                      {/* Impact Analysis */}
                      <div style={{
                        fontSize: '13px',
                        color: '#666',
                        backgroundColor: isSelected ? '#e8f5e8' : '#fff',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <strong>📊 Impact:</strong> {suggestion.impact}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Resolutions Summary */}
      {selectedResolutions.length > 0 && (
        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #4caf50'
        }}>
          <h4 style={{ marginBottom: '8px', color: '#2e7d32' }}>
            ✅ Selected Resolutions ({selectedResolutions.length}):
          </h4>
          
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#2e7d32' }}>
            {selectedResolutions.map((resolution, index) => (
              <li key={index} style={{ fontSize: '14px', marginBottom: '4px' }}>
                <strong>{resolution.type.replace(/_/g, ' ')}:</strong> {resolution.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={applyResolutions}
          disabled={selectedResolutions.length === 0 || loading}
          style={{
            backgroundColor: selectedResolutions.length > 0 && !loading ? '#4caf50' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: selectedResolutions.length > 0 && !loading ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff40',
                borderTop: '2px solid #ffffff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Applying Resolutions...
            </>
          ) : (
            <>
              ✅ Apply Selected Resolutions ({selectedResolutions.length})
            </>
          )}
        </button>

        <button
          onClick={() => setSelectedResolutions([])}
          disabled={selectedResolutions.length === 0 || loading}
          style={{
            backgroundColor: 'transparent',
            color: '#6c757d',
            border: '1px solid #6c757d',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: selectedResolutions.length > 0 && !loading ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🔄 Clear Selections
        </button>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ConflictResolution;
