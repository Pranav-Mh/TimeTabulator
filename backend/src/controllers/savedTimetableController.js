const SavedTimetable = require('../models/SavedTimetable');
const LectureScheduleSession = require('../models/LectureScheduleSession');
const LabScheduleSession = require('../models/LabScheduleSession');
const mongoose = require('mongoose');

// Save a generated timetable
exports.saveTimetable = async (req, res) => {
  try {
    const { name, schedule_id, academicYears, divisions, metadata, statistics } = req.body;
    
    console.log('💾 Saving timetable:', { name, schedule_id });
    
    // Validation
    if (!name || !schedule_id) {
      return res.status(400).json({
        success: false,
        error: 'Name and schedule_id are required'
      });
    }
    
    // Check if timetable with this name already exists
    const existingTimetable = await SavedTimetable.findOne({ name, status: 'active' });
    if (existingTimetable) {
      return res.status(400).json({
        success: false,
        error: `A timetable with name "${name}" already exists. Please use a different name.`
      });
    }
    
    // Create saved timetable
    const savedTimetable = new SavedTimetable({
      name,
      schedule_id,
      academicYears: academicYears || [],
      divisions: divisions || [],
      metadata: metadata || {},
      statistics: statistics || {},
      savedAt: new Date()
    });
    
    await savedTimetable.save();
    
    console.log(`✅ Timetable "${name}" saved successfully`);
    
    res.json({
      success: true,
      message: `Timetable "${name}" saved successfully`,
      savedTimetable
    });
    
  } catch (error) {
    console.error('❌ Error saving timetable:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all saved timetables
exports.getAllSavedTimetables = async (req, res) => {
  try {
    console.log('📂 Fetching all saved timetables...');
    
    const savedTimetables = await SavedTimetable.find({ status: 'active' })
      .sort({ savedAt: -1 });
    
    console.log(`✅ Found ${savedTimetables.length} saved timetables`);
    
    res.json({
      success: true,
      savedTimetables,
      count: savedTimetables.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching saved timetables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get a specific saved timetable with full data
exports.getSavedTimetableById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Fetching saved timetable: ${id}`);
    
    const savedTimetable = await SavedTimetable.findById(id);
    
    if (!savedTimetable) {
      return res.status(404).json({
        success: false,
        error: 'Saved timetable not found'
      });
    }
    
    console.log(`✅ Found saved timetable: "${savedTimetable.name}"`);
    console.log(`📋 Schedule ID to search: ${savedTimetable.schedule_id}`);
    
    const scheduleId = savedTimetable.schedule_id;
    
    // ✅ FIX 1: Try multiple ways to query lab sessions
    let labSessions = [];
    try {
      // Method 1: Direct string comparison
      labSessions = await LabScheduleSession.find({ 
        schedule_id: scheduleId 
      }).lean();
      console.log(`🔬 Method 1: Found ${labSessions.length} lab sessions (string match)`);
      
      // Method 2: Try as ObjectId
      if (labSessions.length === 0) {
        labSessions = await LabScheduleSession.find({ 
          schedule_id: new mongoose.Types.ObjectId(scheduleId) 
        }).lean();
        console.log(`🔬 Method 2: Found ${labSessions.length} lab sessions (ObjectId match)`);
      }
      
      // Method 3: Try string version of ObjectId
      if (labSessions.length === 0) {
        labSessions = await LabScheduleSession.find({ 
          schedule_id: scheduleId.toString() 
        }).lean();
        console.log(`🔬 Method 3: Found ${labSessions.length} lab sessions (string conversion)`);
      }
      
      // Method 4: Get ALL lab sessions and filter manually (debug mode)
      if (labSessions.length === 0) {
        const allLabs = await LabScheduleSession.find().limit(100).lean();
        console.log(`🔬 Debug: Total lab sessions in DB: ${allLabs.length}`);
        if (allLabs.length > 0) {
          console.log(`🔬 Debug: Sample lab session schedule_id type: ${typeof allLabs[0].schedule_id}`);
          console.log(`🔬 Debug: Sample lab session schedule_id value: ${allLabs[0].schedule_id}`);
          console.log(`🔬 Debug: Looking for schedule_id: ${scheduleId} (type: ${typeof scheduleId})`);
          
          // Try manual comparison
          labSessions = allLabs.filter(lab => {
            return lab.schedule_id && lab.schedule_id.toString() === scheduleId.toString();
          });
          console.log(`🔬 Method 4: Found ${labSessions.length} lab sessions (manual filter)`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching lab sessions:', error);
    }
    
    // ✅ FIX 2: Try multiple ways to query lecture sessions
    let lectureSessions = [];
    try {
      // Method 1: Direct string comparison
      lectureSessions = await LectureScheduleSession.find({ 
        schedule_id: scheduleId 
      }).lean();
      console.log(`🎓 Method 1: Found ${lectureSessions.length} lecture sessions (string match)`);
      
      // Method 2: Try as ObjectId
      if (lectureSessions.length === 0) {
        lectureSessions = await LectureScheduleSession.find({ 
          schedule_id: new mongoose.Types.ObjectId(scheduleId) 
        }).lean();
        console.log(`🎓 Method 2: Found ${lectureSessions.length} lecture sessions (ObjectId match)`);
      }
      
      // Method 3: Try string version of ObjectId
      if (lectureSessions.length === 0) {
        lectureSessions = await LectureScheduleSession.find({ 
          schedule_id: scheduleId.toString() 
        }).lean();
        console.log(`🎓 Method 3: Found ${lectureSessions.length} lecture sessions (string conversion)`);
      }
      
    } catch (error) {
      console.error('❌ Error fetching lecture sessions:', error);
    }
    
    console.log(`✅ Final results: ${labSessions.length} lab sessions and ${lectureSessions.length} lecture sessions`);
    
    res.json({
      success: true,
      savedTimetable,
      labSessions,
      lectureSessions,
      totalSessions: labSessions.length + lectureSessions.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching saved timetable:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete a saved timetable (soft delete)
exports.deleteSavedTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting saved timetable: ${id}`);
    
    const savedTimetable = await SavedTimetable.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true }
    );
    
    if (!savedTimetable) {
      return res.status(404).json({
        success: false,
        error: 'Saved timetable not found'
      });
    }
    
    console.log(`✅ Timetable "${savedTimetable.name}" archived successfully`);
    
    res.json({
      success: true,
      message: `Timetable "${savedTimetable.name}" deleted successfully`
    });
    
  } catch (error) {
    console.error('❌ Error deleting saved timetable:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
