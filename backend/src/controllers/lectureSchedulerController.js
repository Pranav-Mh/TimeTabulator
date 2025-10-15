const LectureSchedulingEngine = require('../utils/lectureSchedulingEngine');
const LectureScheduleSession = require('../models/LectureScheduleSession');
const mongoose = require('mongoose');

/**
 * Run lecture scheduler
 */
const runLectureScheduler = async (inputData) => {
  try {
    console.log('🎓 Running Lecture Scheduler...');
    
    const engine = new LectureSchedulingEngine();
    const result = await engine.scheduleLectures(inputData);
    
    return result;
    
  } catch (error) {
    console.error('❌ Lecture Scheduler Error:', error);
    throw error;
  }
};

/**
 * Get lecture schedule by schedule_id
 */
const getLectureSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const lectures = await LectureScheduleSession.find({ schedule_id: scheduleId })
      .populate('subject_id')
      .populate('teacher_id')
      .sort({ day: 1, slot_number: 1 });
    
    res.json({
      success: true,
      data: lectures
    });
    
  } catch (error) {
    console.error('Error fetching lecture schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete lecture schedule
 */
const deleteLectureSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    await LectureScheduleSession.deleteMany({ schedule_id: scheduleId });
    
    res.json({
      success: true,
      message: 'Lecture schedule deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting lecture schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  runLectureScheduler,
  getLectureSchedule,
  deleteLectureSchedule
};
