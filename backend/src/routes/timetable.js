const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');

// Generate new timetable
router.post('/generate', timetableController.generateTimetable);

// Get generation status
router.get('/status/:id', timetableController.getGenerationStatus);

// Save generated timetable
router.post('/save/:id', timetableController.saveTimetable);

// Get saved timetables
router.get('/saved', timetableController.getSavedTimetables);

// Resolve conflicts
router.post('/resolve-conflicts/:id', timetableController.resolveConflicts);

module.exports = router;
