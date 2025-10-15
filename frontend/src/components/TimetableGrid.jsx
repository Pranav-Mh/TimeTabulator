import React, { useState, useEffect } from 'react';

const TimetableGrid = ({ timetableData, labScheduleData, lectureScheduleData }) => {
  const [fetchedLabData, setFetchedLabData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!labScheduleData) {
      fetchLatestLabSchedule();
    }
  }, [labScheduleData]);

  const fetchLatestLabSchedule = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching latest lab schedule from database...');
      
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

  const currentLabData = labScheduleData || fetchedLabData;
  const currentLectureData = lectureScheduleData;

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

  const days = Object.keys(timetableData).filter(day => 
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(day)
  );
  
  const divisions = days.length > 0 ? Object.keys(timetableData[days[0]]) : [];
  const slots = divisions.length > 0 ? Object.keys(timetableData[days[0]][divisions[0]]) : [];

  console.log('📊 Timetable structure:', { days, divisions, slots: slots.length });

  // ✅ NEW: Merge BOTH labs AND lectures into timetable
  const mergeSchedulesWithTimetable = (timetableStructure, labSchedule, lectureSchedule) => {
    let mergedStructure = JSON.parse(JSON.stringify(timetableStructure));
    
    // STEP 1: Merge lab sessions
    if (labSchedule) {
      const labResult = mergeLabsWithTimetable(mergedStructure, labSchedule);
      mergedStructure = labResult.timetable;
    }
    
    // STEP 2: Merge lecture sessions
    if (lectureSchedule) {
      mergedStructure = mergeLecturesWithTimetable(mergedStructure, lectureSchedule);
    }
    
    return mergedStructure;
  };

  // Merge labs with timetable
  const mergeLabsWithTimetable = (timetableStructure, labSchedule) => {
    if (!labSchedule) {
      console.log('ℹ️ No lab schedule data provided');
      return { timetable: timetableStructure, labBlocks: {} };
    }

    let labSessions = [];
    
    if (labSchedule.scheduledLabs && Array.isArray(labSchedule.scheduledLabs)) {
      labSessions = labSchedule.scheduledLabs;
    } else if (labSchedule.schedule_matrix && Array.isArray(labSchedule.schedule_matrix)) {
      labSessions = labSchedule.schedule_matrix;
    } else if (labSchedule.sessions && Array.isArray(labSchedule.sessions)) {
      labSessions = labSchedule.sessions;
    } else if (Array.isArray(labSchedule)) {
      labSessions = labSchedule;
    }
    
    console.log('🔬 Processing lab schedule:', labSessions.length, 'sessions');
    
    const labBlocksByDivision = {};
    
    labSessions.forEach(lab => {
      if (!lab || !lab.day || !lab.division) {
        console.warn('⚠️ Skipping invalid lab session:', lab);
        return;
      }

      const divisionKey = `${lab.day}-${lab.division}`;
      
      if (!labBlocksByDivision[divisionKey]) {
        labBlocksByDivision[divisionKey] = [];
      }
      
      const startSlot = lab.start_slot || lab.slot_number;
      const endSlot = lab.end_slot || (startSlot + 1);
      
      let existingBlock = labBlocksByDivision[divisionKey].find(block =>
        block.start_slot === startSlot && block.end_slot === endSlot
      );
      
      if (!existingBlock) {
        existingBlock = {
          start_slot: startSlot,
          end_slot: endSlot,
          day: lab.day,
          division: lab.division,
          batches: []
        };
        labBlocksByDivision[divisionKey].push(existingBlock);
      }
      
      const teacherDisplayName = lab.teacherName || 
                                 lab.teacher_name || 
                                 lab.teacherDisplayId || 
                                 lab.teacher_display_id || 
                                 (lab.teacher_id ? `T:${lab.teacher_id.toString().slice(-4)}` : 'N/A');
      
      existingBlock.batches.push({
        batch: lab.batch || lab.batchName || 'Unknown',
        subject: lab.subject || lab.subject_name || 'Unknown Subject',
        teacher_id: lab.teacher_id,
        teacher_name: teacherDisplayName,
        teacher_display_id: lab.teacherDisplayId || lab.teacher_display_id,
        lab_id: lab.lab_id || lab.labId || 'Lab',
        formatted: lab.formattedDisplay || lab.formatted || null
      });
    });

    const mergedStructure = JSON.parse(JSON.stringify(timetableStructure));
    
    Object.keys(labBlocksByDivision).forEach(divisionKey => {
      const blocks = labBlocksByDivision[divisionKey];
      
      blocks.forEach(block => {
        const { day, division, start_slot, end_slot } = block;
        
        if (!mergedStructure[day]) {
          console.warn(`⚠️ Creating missing day "${day}" in timetable structure`);
          mergedStructure[day] = {};
        }
        
        if (!mergedStructure[day][division]) {
          console.warn(`⚠️ Creating missing division "${division}" for day "${day}"`);
          mergedStructure[day][division] = {};
          
          for (let i = 1; i <= 8; i++) {
            mergedStructure[day][division][i.toString()] = { activity: 'Free', type: 'free' };
          }
        }

        const startSlotContent = mergedStructure[day][division][start_slot];
        const endSlotContent = mergedStructure[day][division][end_slot];
        
        const canOverride = (slot) => {
          if (!slot) return true;
          if (!slot.activity || slot.activity === 'Free') return true;
          if (slot.type === 'free') return true;
          return false;
        };
        
        if (canOverride(startSlotContent) && canOverride(endSlotContent)) {
          const labBlockData = {
            activity: `Lab Block (${block.batches.length} batches)`,
            type: 'lab-block',
            start_slot,
            end_slot,
            batches: block.batches,
            duration: '2-hour block'
          };
          
          mergedStructure[day][division][start_slot] = labBlockData;
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

  // ✅ NEW: Merge lectures with timetable
  const mergeLecturesWithTimetable = (timetableStructure, lectureSchedule) => {
    if (!lectureSchedule || !lectureSchedule.scheduledLectures) {
      console.log('ℹ️ No lecture schedule data provided');
      return timetableStructure;
    }

    const lectures = lectureSchedule.scheduledLectures;
    console.log('🎓 Processing lecture schedule:', lectures.length, 'sessions');

    const mergedStructure = JSON.parse(JSON.stringify(timetableStructure));

    lectures.forEach(lecture => {
      const { day, division, slot_number, subject_name, teacher_name, classroom_name, formatted_display } = lecture;

      if (!mergedStructure[day]) {
        console.warn(`⚠️ Creating missing day "${day}" for lecture`);
        mergedStructure[day] = {};
      }

      if (!mergedStructure[day][division]) {
        console.warn(`⚠️ Creating missing division "${division}" for lecture`);
        mergedStructure[day][division] = {};
        for (let i = 1; i <= 8; i++) {
          mergedStructure[day][division][i.toString()] = { activity: 'Free', type: 'free' };
        }
      }

      const currentSlot = mergedStructure[day][division][slot_number];

      // Only override if slot is free (don't override labs or restrictions)
      if (!currentSlot || !currentSlot.activity || currentSlot.activity === 'Free' || currentSlot.type === 'free') {
        mergedStructure[day][division][slot_number] = {
          activity: formatted_display || `${subject_name} / ${teacher_name} / ${classroom_name}`,
          type: 'lecture',
          subject: subject_name,
          teacher: teacher_name,
          classroom: classroom_name,
          priority: 3
        };
      } else {
        console.warn(`⚠️ Cannot place lecture (${subject_name}) - slot occupied by ${currentSlot.type}`);
      }
    });

    console.log('✅ Lectures merged into timetable');
    return mergedStructure;
  };

  // ✅ FIXED: Merge both labs and lectures
  const finalTimetableData = mergeSchedulesWithTimetable(timetableData, currentLabData, currentLectureData);

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
          display: 'none'
        };
      case 'lecture': // ✅ NEW: Lecture style
        return {
          backgroundColor: '#a29bfe',
          color: 'white',
          border: '2px solid #6c5ce7',
          fontWeight: '600'
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

  const isHiddenSlot = (activity) => {
    return activity?.type === 'lab-continuation';
  };

  const getColspan = (activity) => {
    if (activity?.type === 'lab-block') {
      return 2;
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
            <span><strong>Sessions Scheduled:</strong> {
              currentLabData.scheduledLabs?.length || 
              currentLabData.schedule_matrix?.length || 
              currentLabData.sessions?.length || 
              0
            }</span>
            <span><strong>Data Source:</strong> {labScheduleData ? 'Live' : 'Database'}</span>
          </div>
        </div>
      )}

      {currentLectureData && (
        <div style={{
          backgroundColor: '#e8f5e9',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #81c784'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#2e7d32', fontSize: '16px' }}>
            🎓 Lecture Scheduling Results
          </h3>
          <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#388e3c', flexWrap: 'wrap' }}>
            <span><strong>Lectures Scheduled:</strong> {currentLectureData.scheduledLectures?.length || 0}</span>
            <span><strong>Unscheduled:</strong> {currentLectureData.unscheduledLectures?.length || 0}</span>
            {currentLectureData.statistics?.utilizationRate && (
              <span><strong>Utilization:</strong> {currentLectureData.statistics.utilizationRate}</span>
            )}
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
                  {formatSlotTime(parseInt(slot))}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <React.Fragment key={day}>
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
                    const activity = finalTimetableData[day]?.[division]?.[slot];
                    
                    if (isHiddenSlot(activity)) {
                      return null;
                    }
                    
                    const style = getActivityStyle(activity);
                    const colspan = getColspan(activity);
                    const isLabBlock = activity?.type === 'lab-block';
                    const isLecture = activity?.type === 'lecture';
                    
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
                                
                                <div style={{ display: 'grid', gap: '4px' }}>
                                  {activity.batches && activity.batches.length > 0 ? (
                                    activity.batches.map((batch, index) => (
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
                                          {batch.lab_id} | {batch.teacher_name}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div style={{ fontSize: '10px', opacity: 0.8 }}>
                                      No batches assigned
                                    </div>
                                  )}
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
                            ) : isLecture ? (
                              // ✅ NEW: Lecture display
                              <div style={{ padding: '4px' }}>
                                <div style={{
                                  fontWeight: '700',
                                  fontSize: '11px',
                                  lineHeight: '1.3'
                                }}>
                                  {activity.subject}
                                </div>
                                <div style={{
                                  fontSize: '9px',
                                  opacity: 0.9,
                                  marginTop: '2px'
                                }}>
                                  {activity.teacher}
                                </div>
                                <div style={{
                                  fontSize: '9px',
                                  opacity: 0.9,
                                  marginTop: '2px'
                                }}>
                                  {activity.classroom}
                                </div>
                              </div>
                            ) : (
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

        {/* ✅ NEW: Lecture legend */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px',
          backgroundColor: '#a29bfe',
          borderRadius: '6px',
          border: '2px solid #6c5ce7',
          color: 'white'
        }}>
          <div style={{ 
            width: '16px',
            height: '16px',
            backgroundColor: '#a29bfe',
            border: '2px solid #6c5ce7',
            borderRadius: '3px'
          }}></div>
          <span style={{ fontWeight: '700' }}>🎓 Lectures</span>
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
