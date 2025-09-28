import React from 'react';

const TimetableGrid = ({ timetableData, labScheduleData }) => {
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

  // Enhanced lab merging with 2-hour block support
  const mergeLabsWithTimetable = (timetableStructure, labSchedule) => {
    if (!labSchedule?.schedule_matrix) return { timetable: timetableStructure, labBlocks: {} };

    console.log('🔬 Processing lab schedule:', labSchedule.schedule_matrix);
    
    // Group labs by division and time block
    const labBlocksByDivision = {};
    const occupiedSlots = new Set(); // Track which slots are occupied by labs
    
    labSchedule.schedule_matrix.forEach(lab => {
      const divisionKey = `${lab.day}-${lab.division}`;
      
      if (!labBlocksByDivision[divisionKey]) {
        labBlocksByDivision[divisionKey] = [];
      }
      
      // Find existing block for this time slot
      let existingBlock = labBlocksByDivision[divisionKey].find(block => 
        block.start_slot === lab.start_slot && block.end_slot === lab.end_slot
      );
      
      if (!existingBlock) {
        // Create new 2-hour lab block
        existingBlock = {
          start_slot: lab.start_slot,
          end_slot: lab.end_slot,
          day: lab.day,
          division: lab.division,
          batches: []
        };
        labBlocksByDivision[divisionKey].push(existingBlock);
      }
      
      // Add batch to this block
      existingBlock.batches.push({
        batch: lab.batch,
        subject: lab.subject,
        teacher_id: lab.teacher_id,
        teacher_name: lab.teacher_name, // FIXED: Get teacher name
        teacher_display_id: lab.teacher_display_id, // FIXED: Get display ID
        lab_id: lab.lab_id,
        formatted: lab.formatted
      });
      
      // Mark slots as occupied
      occupiedSlots.add(`${lab.day}-${lab.division}-${lab.start_slot}`);
      occupiedSlots.add(`${lab.day}-${lab.division}-${lab.end_slot}`);
    });

    // Create merged structure
    const mergedStructure = JSON.parse(JSON.stringify(timetableStructure));
    
    // Apply lab blocks to timetable
    Object.keys(labBlocksByDivision).forEach(divisionKey => {
      const blocks = labBlocksByDivision[divisionKey];
      
      blocks.forEach(block => {
        const { day, division, start_slot, end_slot } = block;
        
        // Check if slots are free or can be overridden
        const startSlotContent = mergedStructure[day]?.[division]?.[start_slot];
        const endSlotContent = mergedStructure[day]?.[division]?.[end_slot];
        
        const canOverride = (slot) => !slot || !slot.activity || slot.activity === 'Free' || slot.type === 'free';
        
        if (canOverride(startSlotContent) && canOverride(endSlotContent)) {
          // Create 2-hour lab block data
          const labBlockData = {
            activity: `Lab Block (${block.batches.length} batches)`,
            type: 'lab-block',
            start_slot,
            end_slot,
            batches: block.batches,
            duration: '2-hour block'
          };
          
          // Set the lab block in the first slot
          mergedStructure[day][division][start_slot] = labBlockData;
          
          // Mark second slot as continuation
          mergedStructure[day][division][end_slot] = {
            activity: 'lab-continuation',
            type: 'lab-continuation',
            parentSlot: start_slot
          };
        }
      });
    });

    console.log('✅ Lab blocks processed:', Object.keys(labBlocksByDivision).length);
    return { timetable: mergedStructure, labBlocks: labBlocksByDivision };
  };

  // Merge lab data with timetable structure
  const { timetable: finalTimetableData, labBlocks } = mergeLabsWithTimetable(timetableData, labScheduleData);

  const getActivityStyle = (activity, slotNum) => {
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
      case 'lab-block':
        return {
          backgroundColor: '#74b9ff',
          color: 'white',
          border: '3px solid #0984e3',
          fontWeight: '700'
        };
      case 'lab-continuation':
        return {
          backgroundColor: '#74b9ff',
          color: 'white',
          border: '3px solid #0984e3',
          opacity: 0.8,
          display: 'none' // Hide continuation cells
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

  // Check if slot should be hidden (continuation of 2-hour block)
  const isHiddenSlot = (activity) => {
    return activity?.type === 'lab-continuation';
  };

  // Calculate colspan for 2-hour lab blocks
  const getColspan = (activity, division, day, slotNum) => {
    if (activity?.type === 'lab-block') {
      return 2; // Span 2 columns for 2-hour block
    }
    return 1;
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
      {/* Lab Schedule Summary */}
      {labScheduleData?.success && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #90caf9'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#1565c0', fontSize: '16px' }}>
            🔬 Lab Scheduling Results
          </h3>
          <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#1976d2', flexWrap: 'wrap' }}>
            <span><strong>Sessions Scheduled:</strong> {labScheduleData.metrics?.total_sessions_scheduled || 0}</span>
            <span><strong>Divisions:</strong> {labScheduleData.metrics?.divisions_scheduled || 0}</span>
            <span><strong>Success Rate:</strong> {labScheduleData.metrics?.success_rate || 0}%</span>
            <span><strong>Lab Blocks:</strong> {Object.keys(labBlocks).length}</span>
          </div>
          {labScheduleData.conflict_report?.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#d32f2f' }}>
              ⚠️ {labScheduleData.conflict_report.length} conflicts found
            </div>
          )}
        </div>
      )}

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
                minWidth: '120px',
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
                    const slotNum = parseInt(slot);
                    const activity = finalTimetableData[day][division][slot];
                    
                    // Skip rendering if this is a continuation slot
                    if (isHiddenSlot(activity)) {
                      return null;
                    }
                    
                    const style = getActivityStyle(activity, slotNum);
                    const colspan = getColspan(activity, division, day, slotNum);
                    const isLabBlock = activity?.type === 'lab-block';
                    
                    return (
                      <td 
                        key={slot} 
                        colSpan={colspan}
                        style={{ 
                          border: '2px solid #dee2e6', 
                          padding: '8px 6px',
                          textAlign: 'center',
                          minHeight: '80px',
                          verticalAlign: 'middle',
                          position: 'relative',
                          ...style
                        }}
                      >
                        {activity && activity.activity ? (
                          <div>
                            {isLabBlock ? (
                              // Enhanced 2-hour lab block display with TEACHER NAMES
                              <div style={{ padding: '4px' }}>
                                <div style={{ 
                                  fontWeight: '800', 
                                  fontSize: '12px',
                                  marginBottom: '8px',
                                  borderBottom: '1px solid rgba(255,255,255,0.3)',
                                  paddingBottom: '4px'
                                }}>
                                  2-HOUR LAB BLOCK
                                </div>
                                
                                {/* Display all batches in this block */}
                                <div style={{ display: 'grid', gap: '4px' }}>
                                  {activity.batches.map((batch, index) => (
                                    <div key={index} style={{
                                      backgroundColor: 'rgba(255,255,255,0.2)',
                                      padding: '3px 6px',
                                      borderRadius: '3px',
                                      fontSize: '10px'
                                    }}>
                                      <div style={{ fontWeight: '700', marginBottom: '1px' }}>
                                        {batch.batch}: {batch.subject}
                                      </div>
                                      <div style={{ opacity: 0.9, fontSize: '9px' }}>
                                        {/* FIXED: Show teacher name instead of ID */}
                                        {batch.lab_id} | {batch.teacher_display_id || batch.teacher_name || `T:${batch.teacher_id.slice(-4)}`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                <div style={{ 
                                  marginTop: '6px', 
                                  fontSize: '9px', 
                                  opacity: 0.8,
                                  fontStyle: 'italic' 
                                }}>
                                  Slots {activity.start_slot}-{activity.end_slot}
                                </div>
                              </div>
                            ) : (
                              // Regular restriction display
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
          <span style={{ fontWeight: '600' }}>🌐 Global Restrictions</span>
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
          <span style={{ fontWeight: '600' }}>🎓 Year-specific</span>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px',
          backgroundColor: '#74b9ff',
          borderRadius: '6px',
          border: '2px solid #0984e3',
          color: 'white'
        }}>
          <div style={{ 
            width: '32px', 
            height: '16px', 
            backgroundColor: '#74b9ff',
            border: '2px solid #0984e3',
            borderRadius: '3px'
          }}></div>
          <span style={{ fontWeight: '700' }}>🔬 2-Hour Lab Blocks (All Batches)</span>
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
          <span>📝 Free Slots</span>
        </div>
      </div>

      {/* Debug Info */}
      {labScheduleData?.schedule_matrix && (
        <div style={{ 
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f1f3f4',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: 'monospace'
        }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
              🔧 Debug: Lab Schedule Data ({labScheduleData.schedule_matrix.length} sessions)
            </summary>
            <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {labScheduleData.schedule_matrix.map((session, index) => (
                <div key={index} style={{ margin: '2px 0' }}>
                  {session.day} | {session.division} | {session.batch} | 
                  Slots {session.start_slot}-{session.end_slot} | 
                  {session.subject} | {session.lab_id} | 
                  Teacher: {session.teacher_display_id || session.teacher_name || 'Unknown'}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default TimetableGrid;
