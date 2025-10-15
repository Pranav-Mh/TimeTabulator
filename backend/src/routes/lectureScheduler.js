const express = require('express');
const router = express.Router();
const {
  getLectureSchedule,
  deleteLectureSchedule
} = require('../controllers/lectureSchedulerController');

// Get lecture schedule by ID
router.get('/:scheduleId', getLectureSchedule);

// Delete lecture schedule
router.delete('/:scheduleId', deleteLectureSchedule);

module.exports = router;
