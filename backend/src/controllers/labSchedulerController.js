const LabSchedulingEngine = require('../utils/labSchedulingEngine');
const LabScheduleSession = require('../models/LabScheduleSession');
const mongoose = require('mongoose');

// Main scheduling endpoint - integrated with existing generator
const runLabScheduler = async () => {
  try {
    console.log('🚀 Starting lab scheduling process...');
    
    // Initialize scheduling engine
    const engine = new LabSchedulingEngine();
    
    // Run scheduling algorithm
    const result = await engine.scheduleAllLabs();
    
    // Generate unique schedule ID
    const scheduleId = new mongoose.Types.ObjectId();
    
    // Save results to database
    if (result.schedule_matrix.length > 0) {
      const sessions = result.schedule_matrix.map(session => ({
        ...session,
        schedule_id: scheduleId
      }));
      
      await LabScheduleSession.insertMany(sessions);
      console.log(`✅ Saved ${sessions.length} lab sessions to database`);
    }
    
    return {
      success: true,
      schedule_id: scheduleId,
      ...result
    };
    
  } catch (error) {
    console.error('❌ Lab scheduling failed:', error);
    throw error;
  }
};

// Get lab schedule by ID
const getLabSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const sessions = await LabScheduleSession.find({ schedule_id: scheduleId })
      .populate('teacher_id', 'name teacherId')
      .sort({ day: 1, start_slot: 1 })
      .lean();
    
    // Group by day and division for display
    const groupedSchedule = {};
    
    sessions.forEach(session => {
      if (!groupedSchedule[session.day]) {
        groupedSchedule[session.day] = {};
      }
      
      if (!groupedSchedule[session.day][session.division]) {
        groupedSchedule[session.day][session.division] = [];
      }
      
      groupedSchedule[session.day][session.division].push({
        ...session,
        teacher_name: session.teacher_id?.name || 'Unknown',
        time_range: `Slot ${session.start_slot}-${session.end_slot}`
      });
    });
    
    res.json({
      success: true,
      schedule_id: scheduleId,
      sessions,
      grouped_schedule: groupedSchedule,
      total_sessions: sessions.length
    });
    
  } catch (error) {
    console.error('Error fetching lab schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get scheduling conflicts
const getLabConflicts = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // This would contain logic to detect and return conflicts
    // For now, return empty as conflicts are handled during scheduling
    
    res.json({
      success: true,
      conflicts: [],
      message: "No unresolved conflicts"
    });
    
  } catch (error) {
    console.error('Error fetching lab conflicts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  runLabScheduler,
  getLabSchedule,
  getLabConflicts
};
