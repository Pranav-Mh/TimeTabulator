const express = require('express');
const router = express.Router();
const timeSlotController = require('../controllers/timeSlotController');

// Save time configuration
router.post('/time-configuration', timeSlotController.saveTimeConfiguration);

// Get time configuration
router.get('/time-configuration', timeSlotController.getTimeConfiguration);

module.exports = router;
