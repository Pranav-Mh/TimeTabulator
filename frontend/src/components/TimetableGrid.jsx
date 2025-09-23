import React, { useState } from 'react';

const TimetableGrid = ({ timetable, status, conflicts = [] }) => {
  const [selectedView, setSelectedView] = useState('all'); // 'all', specific division
  const [selectedDay, setSelectedDay] = useState('all'); // 'all', specific day

  if (!timetable || !timetable.slots) {
    return (
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '40px',
        borderRadius: '12px',
        textAlign: 'center',
        color: '#6c757d'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
        <p>No timetable data available</p>
      </div>
    );
  }

  // ✅ Process timetable data
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const divisions = [...new Set(timetable.slots.map(slot => `${slot.division.year}-${slot.division.divisionName}`))];
  const maxSlot = Math.max(...timetable.slots.map(slot => slot.slotNumber));
  const slots = Array.from({ length: maxSlot }, (_, i) => i + 1);

  // ✅ Group slots by division and day
  const groupedSlots = {};
  divisions.forEach(div => {
    groupedSlots[div] = {};
    days.forEach(day => {
      groupedSlots[div][day] = {};
      slots.forEach(slotNum => {
        groupedSlots[div][day][slotNum] = null;
      });
    });
  });

  // ✅ Fill in the assignments
  timetable.slots.forEach(slot => {
    const divKey = `${slot.division.year}-${slot.division.divisionName}`;
    if (groupedSlots[divKey] && groupedSlots[divKey][slot.day]) {
      groupedSlots[divKey][slot.day][slot.slotNumber] = slot;
    }
  });

  // ✅ Get filtered divisions based on selected view
  const filteredDivisions = selectedView === 'all' 
    ? divisions 
    : divisions.filter(div => div === selectedView);

  // ✅ Get filtered days based on selected day
  const filteredDays = selectedDay === 'all' 
    ? days 
    : [selectedDay];

  // ✅ Get slot time range
  const getSlotTime = (slotNumber) => {
    const times = {
      1: '08:00-09:00',
      2: '09:00-10:00', 
      3: '10:00-10:15', // Short break
      4: '10:15-11:15',
      5: '11:15-12:15',
      6: '12:15-13:00', // Lunch
      7: '13:00-14:00',
      8: '14:00-15:00'
    };
    return times[slotNumber] || `Slot ${slotNumber}`;
  };

  // ✅ Get cell content and styling
  const getCellInfo = (slot) => {
    if (!slot) {
      return {
        content: <span style={{ color: '#999' }}>Free</span>,
        style: { backgroundColor: '#f8f9fa', color: '#6c757d' }
      };
    }

    const isLab = slot.type === 'lab';
    const isConflicted = conflicts.some(conflict => 
      conflict.affectedDivisions?.includes(`${slot.division.year}-${slot.division.divisionName}`)
    );

    return {
      content: (
        <div style={{ fontSize: '12px', lineHeight: '1.2' }}>
          <div style={{ fontWeight: 'bold', color: isLab ? '#1976d2' : '#2e7d32' }}>
            {slot.subject.name}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            {slot.teacher.name}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            {slot.room.name}
          </div>
          {isLab && slot.batch && (
            <div style={{ fontSize: '10px', color: '#1976d2', fontWeight: 'bold' }}>
              {slot.batch}
            </div>
          )}
        </div>
      ),
      style: {
        backgroundColor: isConflicted ? '#ffebee' : (isLab ? '#e3f2fd' : '#e8f5e8'),
        border: isConflicted ? '2px solid #f44336' : '1px solid #ddd',
        color: isConflicted ? '#d32f2f' : '#333'
      }
    };
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h3 style={{ margin: 0, color: '#333' }}>
          📅 Master Timetable {status === 'conflicts' && '(With Conflicts)'}
        </h3>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Day Filter */}
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Days</option>
            {days.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          {/* Division Filter */}
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Divisions</option>
            {divisions.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '16px',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#e8f5e8', 
            border: '1px solid #4caf50',
            borderRadius: '3px' 
          }}></div>
          <span>Theory Lecture</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#e3f2fd', 
            border: '1px solid #2196f3',
            borderRadius: '3px' 
          }}></div>
          <span>Lab Session</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #ddd',
            borderRadius: '3px' 
          }}></div>
          <span>Free Slot</span>
        </div>

        {status === 'conflicts' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              backgroundColor: '#ffebee', 
              border: '2px solid #f44336',
              borderRadius: '3px' 
            }}></div>
            <span>Conflict</span>
          </div>
        )}
      </div>

      {/* Timetable Grid */}
      <div style={{ 
        overflowX: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {filteredDays.map(day => (
          <div key={day} style={{ marginBottom: '24px' }}>
            {/* Day Header */}
            <div style={{
              backgroundColor: '#1976d2',
              color: 'white',
              padding: '12px 16px',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              {day}
            </div>

            {/* Day Timetable */}
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '12px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    borderBottom: '2px solid #ddd',
                    minWidth: '120px',
                    fontWeight: '600'
                  }}>
                    Division
                  </th>
                  {slots.map(slotNum => (
                    <th key={slotNum} style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      minWidth: '140px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      <div>Slot {slotNum}</div>
                      <div style={{ fontSize: '10px', color: '#666', fontWeight: 'normal' }}>
                        {getSlotTime(slotNum)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDivisions.map((division, divIndex) => (
                  <tr key={division} style={{
                    backgroundColor: divIndex % 2 === 0 ? '#fdfdfd' : 'white'
                  }}>
                    <td style={{
                      padding: '12px 8px',
                      fontWeight: '600',
                      borderRight: '1px solid #ddd',
                      borderBottom: '1px solid #eee',
                      color: '#333'
                    }}>
                      {division}
                    </td>
                    {slots.map(slotNum => {
                      const slot = groupedSlots[division][day][slotNum];
                      const cellInfo = getCellInfo(slot);
                      
                      return (
                        <td key={slotNum} style={{
                          padding: '8px 4px',
                          textAlign: 'center',
                          borderRight: '1px solid #eee',
                          borderBottom: '1px solid #eee',
                          minHeight: '80px',
                          verticalAlign: 'middle',
                          ...cellInfo.style
                        }}>
                          {cellInfo.content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Statistics Summary */}
      {timetable.statistics && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          <strong>Quick Stats:</strong> {timetable.statistics.totalSlots} total assignments • 
          {timetable.statistics.totalSubjects} subjects • 
          {timetable.statistics.totalTeachers} teachers • 
          {timetable.statistics.utilizationRate}% slot utilization
        </div>
      )}
    </div>
  );
};

export default TimetableGrid;
