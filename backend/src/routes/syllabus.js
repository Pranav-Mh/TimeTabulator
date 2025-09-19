const express = require('express');
const router = express.Router();
const syllabusController = require('../controllers/syllabusController');

router.post('/', syllabusController.saveSyllabus);

module.exports = router;
