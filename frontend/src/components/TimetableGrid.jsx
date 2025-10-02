import React, { useState, useEffect } from 'react';

const TimetableGrid = ({ timetableData, labScheduleData }) => {
  const [fetchedLabData, setFetchedLabData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch latest lab schedule from database if not provided
  useEffect(() => {
    if (!labScheduleData) {
      fetchLatestLabSchedule();
    }
  }, [labScheduleData]);

  const fetchLatestLabSchedule = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching latest lab schedule from database...');
      
      // ✅ Make sure this URL matches your backend route
      const response = await fetch('http://localhost:5000/api/generator/lab-schedule/latest');
      if (response.ok) {
        const data = await response.json();
        setFetchedLabData(data);
        console.log('✅ Lab schedule fetched:', data);
      } else {
        console.log('ℹ️ No lab schedule found - Status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching lab schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use provided lab data or fetched data
  const currentLabData = labScheduleData || fetchedLabData;

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

  // ✅ Enhanced lab merging with PROPER TEACHER NAME display
  const mergeLabsWithTimetable = (timetableStructure, labSchedule) => {
    if (!labSchedule?.schedule_matrix && !labSchedule?.sessions) {
      return { timetable: timetableStructure, labBlocks: {} };
    }

    // Handle both possible data structures
    const labSessions = labSchedule.schedule_matrix || labSchedule.sessions || [];
    console.log('🔬 Processing lab schedule:', labSessions.length, 'sessions');
    
    // Group labs by division and time block
    const labBlocksByDivision = {};
    
    labSessions.forEach(lab => {
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
      
      // ✅ Enhanced batch data with proper teacher name resolution
      const teacherDisplayName = lab.teacherName || lab.teacher_name || 
                                lab.teacherDisplayId || lab.teacher_display_id || 
                                `T:${lab.teacher_id?.slice(-4) || 'N/A'}`;
      
      // Add batch to this block
      existingBlock.batches.push({
        batch: lab.batch,
        subject: lab.subject,
        teacher_id: lab.teacher_id,
        teacher_name: teacherDisplayName,  // ✅ Use resolved teacher name
        teacher_display_id: lab.teacherDisplayId || lab.teacher_display_id,
        lab_id: lab.lab_id,
        formatted: lab.formattedDisplay || lab.formatted
      });
    });

    // Create merged structure
    const mergedStructure = JSON.parse(JSON.stringify(timetableStructure));
    
    // Apply lab blocks to timetable
    Object.keys(labBlocksByDivision).forEach(divisionKey => {
      const blocks = labBlocksByDivision[divisionKey];
      
      blocks.forEach(block => {
        const { day, division, start_slot, end_slot } = block;
        
        // Check if slots exist in timetable structure
        if (!mergedStructure[day] || !mergedStructure[day][division]) {
          return;
        }

        const startSlotContent = mergedStructure[day][division][start_slot];
        const endSlotContent = mergedStructure[day][division][end_slot];
        
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
  const { timetable: finalTimetableData, labBlocks } = mergeLabsWithTimetable(timetableData, currentLabData);

  const getActivityStyle = (activity) => {
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
      case 'lab-block':
        return {
          backgroundColor: '#74b9ff',
          color: 'white',
          border: '3px solid #0984e3',
          fontWeight: '700'
        };
      case 'lab-continuation':
        return {
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
  const getColspan = (activity) => {
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
      {/* Loading indicator */}
      {loading && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          textAlign: 'center',
          color: '#1565c0'
        }}>
          🔄 Loading lab schedule data...
        </div>
      )}

      {/* Lab Schedule Summary */}
      {currentLabData && (
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
            <span><strong>Sessions Scheduled:</strong> {currentLabData.schedule_matrix?.length || currentLabData.sessions?.length || 0}</span>
            <span><strong>Lab Blocks:</strong> {Object.keys(labBlocks).length}</span>
            <span><strong>Data Source:</strong> {labScheduleData ? 'Live' : 'Database'}</span>
          </div>
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
                    
                    const style = getActivityStyle(activity);
                    const colspan = getColspan(activity);
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
                              // ✅ FIXED: 2-hour lab block display with PROPER teacher names
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
                                
                                {/* Display all batches in this block with PROPER teacher names */}
                                <div style={{ display: 'grid', gap: '4px' }}>
                                  {activity.batches?.map((batch, index) => (
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
                                        {/* ✅ FIXED: Display proper teacher name instead of ID */}
                                        {batch.lab_id} | {batch.teacher_name}
                                      </div>
                                    </div>
                                  )) || []}
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
          <span style={{ fontWeight: '700' }}>🔬 2-Hour Lab Blocks</span>
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
    </div>
  );
};

export default TimetableGrid;
