const express = require('express');
const router = express.Router();
const { resetWorkingData } = require('../controllers/resetController');

router.post('/reset-working-data', resetWorkingData);

module.exports = router;
