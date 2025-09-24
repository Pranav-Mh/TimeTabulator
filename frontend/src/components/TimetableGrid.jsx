import React from 'react';

const TimetableGrid = ({ timetableData }) => {
  if (!timetableData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        No timetable data available
      </div>
    );
  }

  const { divisions, slots, days } = timetableData;

  // ✅ Get slot display info
  const getSlotInfo = (slot) => {
    if (slot.isBooked) {
      return {
        display: slot.bookedBy || 'RECESS',
        style: {
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          fontWeight: '600',
          textAlign: 'center'
        }
      };
    }
    return {
      display: '',
      style: {
        backgroundColor: '#f9fafb',
        border: '1px dashed #d1d5db',
        textAlign: 'center'
      }
    };
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: '600', 
        marginBottom: '20px',
        color: '#333'
      }}>
        Generated Timetable Structure
      </h2>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            {/* Header Row */}
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: '600',
                  borderBottom: '2px solid #dee2e6',
                  color: '#495057',
                  width: '120px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: '#f8f9fa',
                  zIndex: 10
                }}>
                  Day / Division
                </th>
                {slots.map((slot, index) => (
                  <th key={index} style={{
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    color: '#495057',
                    fontSize: '12px',
                    minWidth: '100px',
                    backgroundColor: slot.isBooked ? '#fee2e2' : '#f8f9fa'
                  }}>
                    <div>Slot {slot.slotNumber}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      {slot.startTime}-{slot.endTime}
                    </div>
                    {slot.isBooked && (
                      <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: '700' }}>
                        {slot.bookedBy || 'BLOCKED'}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {days.map((day, dayIndex) => (
                <React.Fragment key={day}>
                  {/* Day Header Row */}
                  <tr style={{ backgroundColor: '#e5e7eb' }}>
                    <td style={{
                      padding: '10px 12px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #d1d5db',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: '#e5e7eb',
                      zIndex: 9
                    }}>
                      {day}
                    </td>
                    {slots.map((slot, slotIndex) => (
                      <td key={slotIndex} style={{
                        borderBottom: '1px solid #d1d5db',
                        backgroundColor: '#e5e7eb'
                      }}></td>
                    ))}
                  </tr>

                  {/* Division Rows for this day */}
                  {divisions.map((division, divIndex) => (
                    <tr key={`${day}-${division}`} style={{
                      backgroundColor: divIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
                      borderBottom: divIndex === divisions.length - 1 ? '2px solid #d1d5db' : '1px solid #e5e7eb'
                    }}>
                      <td style={{
                        padding: '10px 12px',
                        fontWeight: '500',
                        color: '#4b5563',
                        borderRight: '1px solid #e5e7eb',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: divIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
                        zIndex: 8
                      }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: division.startsWith('SE') ? '#dbeafe' : 
                                          division.startsWith('TE') ? '#dcfce7' : '#fef3c7',
                          color: division.startsWith('SE') ? '#1e40af' : 
                                 division.startsWith('TE') ? '#166534' : '#92400e',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {division}
                        </span>
                      </td>
                      
                      {slots.map((slot, slotIndex) => {
                        const slotInfo = getSlotInfo(slot);
                        return (
                          <td key={slotIndex} style={{
                            padding: '8px 4px',
                            fontSize: '11px',
                            borderRight: '1px solid #e5e7eb',
                            minHeight: '40px',
                            ...slotInfo.style
                          }}>
                            {slotInfo.display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timetable Info */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <strong>Total Divisions:</strong> {divisions.length}
          </div>
          <div>
            <strong>Total Slots:</strong> {slots.length}
          </div>
          <div>
            <strong>Available Slots:</strong> {slots.filter(slot => !slot.isBooked).length}
          </div>
          <div>
            <strong>Blocked Slots:</strong> {slots.filter(slot => slot.isBooked).length}
          </div>
        </div>
        
        <div style={{ marginTop: '12px', fontSize: '12px' }}>
          <strong>Legend:</strong> 
          <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '3px' }}>SE</span>
          <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '3px' }}>TE</span>
          <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '3px' }}>BE</span>
          <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '3px' }}>Blocked</span>
        </div>
      </div>
    </div>
  );
};

export default TimetableGrid;
