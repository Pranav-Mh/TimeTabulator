const express = require('express');
const router = express.Router();
const { getLabSchedule, getLabConflicts } = require('../controllers/labSchedulerController');

// Get lab schedule by ID
router.get('/schedule/:scheduleId', getLabSchedule);

// Get scheduling conflicts
router.get('/conflicts/:scheduleId', getLabConflicts);

// Get schedule status
router.get('/status/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const LabScheduleSession = require('../models/LabScheduleSession');
    const sessions = await LabScheduleSession.find({ schedule_id: scheduleId });
    
    res.json({
      success: true,
      schedule_id: scheduleId,
      total_sessions: sessions.length,
      status: sessions.length > 0 ? 'completed' : 'not_found'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
