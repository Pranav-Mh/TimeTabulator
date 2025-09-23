const express = require('express');
const router = express.Router();
const timetableGeneratorController = require('../controllers/timetableGeneratorController');

// ✅ Start Timetable Generation
router.get('/generate', timetableGeneratorController.generateTimetable);

// ✅ Get All Generated Timetables (Dashboard)
router.get('/all', timetableGeneratorController.getAllTimetables);

// ✅ Get Specific Timetable by ID
router.get('/:id', timetableGeneratorController.getTimetableById);

// ✅ Save Generated Timetable
router.post('/save', timetableGeneratorController.saveTimetable);

// ✅ Resolve Conflicts with Relaxation Options
router.post('/resolve-conflicts', timetableGeneratorController.resolveConflicts);

// ✅ Delete Generated Timetable
router.delete('/:id', timetableGeneratorController.deleteTimetable);

module.exports = router;
