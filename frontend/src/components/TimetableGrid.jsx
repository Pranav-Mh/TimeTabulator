import React from 'react';

const TimetableGrid = ({ timetableData }) => {
  if (!timetableData || typeof timetableData !== 'object') {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#666',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        No timetable data available
      </div>
    );
  }

  const days = Object.keys(timetableData);
  const divisions = days.length > 0 ? Object.keys(timetableData[days[0]]) : [];
  const slots = divisions.length > 0 ? Object.keys(timetableData[days[0]][divisions[0]]) : [];

  const getActivityStyle = (activity) => {
    // Handle null or undefined activity
    if (!activity || !activity.activity) {
      return {
        backgroundColor: '#f8f9fa',
        color: '#6c757d',
        border: '1px solid #dee2e6'
      };
    }

    switch (activity.type) {
      case 'global-restriction':
        return {
          backgroundColor: '#fff3cd',
          color: '#856404',
          border: '2px solid #ffc107',
          fontWeight: '700'
        };
      case 'year-restriction':
        return {
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          border: '2px solid #17a2b8',
          fontWeight: '600'
        };
      case 'lecture':
        return {
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb'
        };
      case 'lab':
        return {
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb'
        };
      default:
        return {
          backgroundColor: '#e2e3e5',
          color: '#383d41',
          border: '1px solid #d6d8db'
        };
    }
  };

  const formatSlotTime = (slotNumber) => {
    // You can customize this based on your time slot configuration
    const times = {
      1: '08:00-09:00',
      2: '09:00-10:00', 
      3: '10:00-10:15',
      4: '10:15-11:15',
      5: '11:15-12:15',
      6: '12:15-13:00',
      7: '13:00-14:00',
      8: '14:00-15:00'
    };
    return times[slotNumber] || `Slot ${slotNumber}`;
  };

  return (
    <div style={{ 
      overflowX: 'auto', 
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      padding: '24px',
      marginTop: '20px'
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        fontSize: '13px'
      }}>
        <thead>
          <tr>
            <th style={{ 
              border: '2px solid #495057', 
              padding: '12px 8px', 
              backgroundColor: '#495057',
              color: 'white',
              fontWeight: '600',
              minWidth: '120px'
            }}>
              Day / Division
            </th>
            {slots.map(slot => (
              <th key={slot} style={{ 
                border: '2px solid #495057', 
                padding: '12px 6px', 
                backgroundColor: '#495057',
                color: 'white',
                fontWeight: '600',
                minWidth: '100px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '14px' }}>Slot {slot}</div>
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                  {formatSlotTime(slot)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <React.Fragment key={day}>
              {/* Day Header Row */}
              <tr>
                <td colSpan={slots.length + 1} style={{
                  backgroundColor: '#6c757d',
                  padding: '10px 12px',
                  fontWeight: '700',
                  border: '2px solid #495057',
                  color: 'white',
                  fontSize: '15px'
                }}>
                  📅 {day}
                </td>
              </tr>
              
              {/* Division Rows */}
              {divisions.map(division => (
                <tr key={`${day}-${division}`}>
                  <td style={{ 
                    border: '2px solid #dee2e6', 
                    padding: '10px 12px',
                    backgroundColor: '#f8f9fa',
                    fontWeight: '700',
                    color: division.startsWith('SE') ? '#2563eb' : 
                          division.startsWith('TE') ? '#059669' : '#dc2626',
                    fontSize: '14px'
                  }}>
                    {division}
                  </td>
                  {slots.map(slot => {
                    const activity = timetableData[day][division][slot];
                    const style = getActivityStyle(activity);
                    
                    return (
                      <td key={slot} style={{ 
                        border: '2px solid #dee2e6', 
                        padding: '8px 6px',
                        textAlign: 'center',
                        minHeight: '60px',
                        verticalAlign: 'middle',
                        ...style
                      }}>
                        {activity && activity.activity ? (
                          <div>
                            <div style={{ 
                              fontWeight: activity.type === 'global-restriction' ? '700' : '600', 
                              fontSize: '12px',
                              lineHeight: '1.2'
                            }}>
                              {activity.activity}
                            </div>
                            {activity.type === 'global-restriction' && (
                              <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
                                🌐 Global
                              </div>
                            )}
                            {activity.type === 'year-restriction' && activity.academicYear && (
                              <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
                                🎓 {activity.academicYear}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: '#6c757d', fontSize: '11px', fontStyle: 'italic' }}>
                            Free
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {/* Spacer between days */}
              <tr style={{ height: '10px' }}>
                <td colSpan={slots.length + 1} style={{ 
                  backgroundColor: 'transparent', 
                  border: 'none' 
                }}></td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
      
      {/* Enhanced Legend */}
      <div style={{ 
        marginTop: '24px', 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        fontSize: '13px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px',
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          border: '1px solid #ffc107'
        }}>
          <div style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '3px'
          }}></div>
          <span style={{ fontWeight: '600' }}>🌐 Global Restrictions (College-wide)</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px',
          backgroundColor: '#d1ecf1',
          borderRadius: '6px',
          border: '1px solid #17a2b8'
        }}>
          <div style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#d1ecf1',
            border: '2px solid #17a2b8',
            borderRadius: '3px'
          }}></div>
          <span style={{ fontWeight: '600' }}>🎓 Year-specific Restrictions</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px'
          }}></div>
          <span>📝 Free Slots (Available for lectures)</span>
        </div>
      </div>
    </div>
  );
};

export default TimetableGrid;
